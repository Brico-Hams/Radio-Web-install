# -*- coding: utf-8 -*-
"""
Fila de trabalhos seriais.

A porta serial só aguenta um comando por vez e a interface Tk só pode ser
tocada pela thread principal. Este módulo resolve as duas coisas:

  * `SerialWorker` roda os trabalhos em UMA thread de fundo, em ordem;
  * cada trabalho pode ter uma `key`: ao enfileirar outro com a mesma chave,
    o anterior ainda pendente é descartado (útil para sliders: só interessa
    o último valor);
  * o resultado volta para a thread Tk por um callback `ui(fn)`.

Substitui a flag `busy` + listas de "pendentes" da v0.1.
"""

import collections
import logging
import threading
from dataclasses import dataclass, field
from typing import Any, Callable, Deque, Optional

log = logging.getLogger(__name__)


@dataclass
class Job:
    fn: Callable[[], Any]
    then: Optional[Callable[[Any], None]] = None
    on_error: Optional[Callable[[BaseException], None]] = None
    title: str = ""
    key: Optional[str] = None
    tag: Any = None                       # dado livre do chamador (ex.: o rádio alvo)
    done_event: threading.Event = field(default_factory=threading.Event)


class SerialWorker:
    def __init__(self, ui: Callable[[Callable[[], None]], None],
                 on_idle_change: Optional[Callable[[bool], None]] = None):
        self._ui = ui
        self._on_idle_change = on_idle_change
        self._queue: Deque[Job] = collections.deque()
        self._cv = threading.Condition()
        self._current: Optional[Job] = None
        self.stop_event = threading.Event()
        self._thread = threading.Thread(target=self._run, name="serial-worker", daemon=True)
        self._thread.start()

    # -- API usada pela interface ------------------------------------------
    def submit(self, fn, then=None, on_error=None, title="", key=None, tag=None) -> Job:
        job = Job(fn, then, on_error, title, key, tag)
        with self._cv:
            if key is not None:
                self._queue = collections.deque(j for j in self._queue if j.key != key)
            self._queue.append(job)
            self._cv.notify()
        return job

    def is_idle(self) -> bool:
        with self._cv:
            return self._current is None and not self._queue

    def pending(self, key: str) -> bool:
        with self._cv:
            return any(j.key == key for j in self._queue) or (
                self._current is not None and self._current.key == key)

    def cancel_pending(self) -> None:
        with self._cv:
            self._queue.clear()

    def stop(self) -> None:
        """Pede para o trabalho atual parar (ele precisa checar `stop_event`) e
        descarta os pendentes."""
        self.stop_event.set()
        self.cancel_pending()

    # -- thread de fundo ------------------------------------------------------
    def _run(self) -> None:
        while True:
            with self._cv:
                while not self._queue:
                    self._cv.wait()
                job = self._queue.popleft()
                self._current = job
            self.stop_event.clear()
            self._ui(lambda: self._idle_changed(False))
            result, err = None, None
            try:
                result = job.fn()
            except BaseException as exc:          # noqa: BLE001 - erro vai para a UI
                err = exc
                log.debug("job %r failed", job.title, exc_info=True)
            with self._cv:
                self._current = None
                idle_now = not self._queue
            stopped = self.stop_event.is_set()
            # Argumentos padrão "congelam" os valores: a lambda roda mais tarde na
            # thread Tk, quando este loop já pode ter passado para o próximo job.
            self._ui(lambda j=job, r=result, e=err, s=stopped, i=idle_now:
                     self._finish(j, r, e, s, i))

    def _finish(self, job, result, err, stopped, idle_now) -> None:
        try:
            if err is not None:
                if job.on_error:
                    job.on_error(err)
            elif not stopped and job.then:
                job.then(result)
        finally:
            job.done_event.set()
            if idle_now:
                self._idle_changed(True)

    def _idle_changed(self, idle: bool) -> None:
        if self._on_idle_change:
            self._on_idle_change(idle)
