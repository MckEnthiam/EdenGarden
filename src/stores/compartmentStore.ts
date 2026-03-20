import { create } from 'zustand'
import { Compartment } from '../types/models'

interface CompartmentStore {
  compartments: Compartment[]
  activeCompartmentId: string | null
  loading: boolean
  setCompartments: (c: Compartment[]) => void
  setActiveCompartment: (id: string | null) => void
  setLoading: (v: boolean) => void
  updateCompartment: (c: Compartment) => void
  addCompartment: (c: Compartment) => void
  removeCompartment: (id: string) => void
}

export const useCompartmentStore = create<CompartmentStore>((set) => ({
  compartments: [],
  activeCompartmentId: null,
  loading: false,
  setCompartments: (c) => set({ compartments: c }),
  setActiveCompartment: (id) => set({ activeCompartmentId: id }),
  setLoading: (v) => set({ loading: v }),
  updateCompartment: (c) =>
    set((s) => ({ compartments: s.compartments.map((x) => (x.id === c.id ? c : x)) })),
  addCompartment: (c) => set((s) => ({ compartments: [c, ...s.compartments] })),
  removeCompartment: (id) =>
    set((s) => ({ compartments: s.compartments.filter((x) => x.id !== id) })),
}))
