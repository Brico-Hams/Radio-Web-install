package org.bricohams.digital;

/** Check before work and at least every 4096 samples / every FEC iteration. */
public interface WorkBudget {
    void checkpoint() throws CodecException;
}
