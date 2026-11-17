# -*- coding: utf-8 -*-
"""Fila de trabalhos: ordem, coalescência por chave e tratamento de erro."""

import queue
import threading
import time

from ftx1cat.ui.worker import SerialWorker


class FakeTk:
    """Executa os callbacks de interface numa fila, como o Tk faria."""

    def __init__(self):
        self.q = queue.Queue()

    def ui(self, fn):
        self.q.put(fn)

    def pump(self, timeout=1.0):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            try:
                self.q.get(timeout=0.02)()
            except queue.Empty:
                pass


def test_jobs_run_in_order_and_results_reach_ui():
    tk = FakeTk()
    worker = SerialWorker(tk.ui)
    results = []
    gate = threading.Event()
    worker.submit(lambda: (gate.wait(1), "a")[1], then=results.append)
    worker.submit(lambda: "b", then=results.append)
    gate.set()
    tk.pump(0.5)
    assert results == ["a", "b"]
    assert worker.is_idle()


def test_same_key_replaces_pending_job():
    tk = FakeTk()
    worker = SerialWorker(tk.ui)
    ran = []
    gate = threading.Event()
    worker.submit(lambda: gate.wait(1), title="blocker")
    for v in (1, 2, 3):
        worker.submit(lambda v=v: ran.append(v), key="slider")
    assert worker.pending("slider")
    gate.set()
    tk.pump(0.5)
    assert ran == [3]


def test_error_goes_to_on_error_not_then():
    tk = FakeTk()
    worker = SerialWorker(tk.ui)
    seen = {}

    def boom():
        raise RuntimeError("x")

    worker.submit(boom, then=lambda r: seen.setdefault("then", r),
                  on_error=lambda e: seen.setdefault("err", str(e)))
    tk.pump(0.5)
    assert seen == {"err": "x"}


def test_stop_cancels_pending_and_flags_current():
    tk = FakeTk()
    worker = SerialWorker(tk.ui)
    started = threading.Event()
    seen = []

    def long_job():
        started.set()
        while not worker.stop_event.is_set():
            time.sleep(0.01)
        return "stopped"

    worker.submit(long_job, then=seen.append)
    worker.submit(lambda: "never", then=seen.append)
    started.wait(1)
    worker.stop()
    tk.pump(0.5)
    assert seen == []                      # then não roda quando parado
    assert worker.is_idle()


def test_idle_callback():
    tk = FakeTk()
    states = []
    worker = SerialWorker(tk.ui, on_idle_change=states.append)
    worker.submit(lambda: None)
    tk.pump(0.3)
    assert states == [False, True]
