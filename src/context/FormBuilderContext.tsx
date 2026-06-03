"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  seedForms,
  type FormDefinition,
  type FormField,
} from "@/data/padel/forms";

/* Form definitions store. Seeded, localStorage-persisted, CRUD via the
 * platform Form Builder. DynamicFormRenderer consumes a FormDefinition. */

const STORAGE_KEY = "padelhub-forms";

type FormBuilderContextType = {
  forms: FormDefinition[];
  isReady: boolean;
  getForm: (id: string) => FormDefinition | undefined;
  addForm: (
    form: Omit<FormDefinition, "id"> & Partial<Pick<FormDefinition, "id">>,
  ) => FormDefinition;
  updateForm: (id: string, patch: Partial<Omit<FormDefinition, "id">>) => void;
  deleteForm: (id: string) => void;
  /** field-level helpers operating on a form */
  addField: (formId: string, field: FormField) => void;
  updateField: (formId: string, name: string, patch: Partial<FormField>) => void;
  removeField: (formId: string, name: string) => void;
  reorderFields: (formId: string, orderedNames: string[]) => void;
  resetForms: () => void;
};

const FormBuilderContext = createContext<FormBuilderContextType | undefined>(
  undefined,
);

export const useFormBuilder = () => {
  const ctx = useContext(FormBuilderContext);
  if (!ctx)
    throw new Error("useFormBuilder must be used within a FormBuilderProvider");
  return ctx;
};

const genId = () =>
  `form-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const FormBuilderProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [forms, setForms] = useState<FormDefinition[]>(() => [...seedForms]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FormDefinition[];
        if (Array.isArray(parsed) && parsed.length) setForms(parsed);
      }
    } catch {
      /* ignore */
    }
    setIsReady(true);
  }, []);

  const persist = useCallback((next: FormDefinition[]) => {
    if (typeof window !== "undefined")
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const commit = useCallback(
    (updater: (prev: FormDefinition[]) => FormDefinition[]) => {
      setForms((prev) => {
        const next = updater(prev);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const getForm = useCallback(
    (id: string) => forms.find((f) => f.id === id),
    [forms],
  );

  const addForm = useCallback<FormBuilderContextType["addForm"]>(
    (form) => {
      const created: FormDefinition = { ...form, id: form.id ?? genId() };
      commit((prev) => [...prev, created]);
      return created;
    },
    [commit],
  );

  const updateForm = useCallback(
    (id: string, patch: Partial<Omit<FormDefinition, "id">>) => {
      commit((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    },
    [commit],
  );

  const deleteForm = useCallback(
    (id: string) => commit((prev) => prev.filter((f) => f.id !== id)),
    [commit],
  );

  const mapForm = useCallback(
    (formId: string, fn: (f: FormDefinition) => FormDefinition) =>
      commit((prev) => prev.map((f) => (f.id === formId ? fn(f) : f))),
    [commit],
  );

  const addField = useCallback(
    (formId: string, field: FormField) =>
      mapForm(formId, (f) => ({ ...f, fields: [...f.fields, field] })),
    [mapForm],
  );

  const updateField = useCallback(
    (formId: string, name: string, patch: Partial<FormField>) =>
      mapForm(formId, (f) => ({
        ...f,
        fields: f.fields.map((fl) =>
          fl.name === name ? { ...fl, ...patch } : fl,
        ),
      })),
    [mapForm],
  );

  const removeField = useCallback(
    (formId: string, name: string) =>
      mapForm(formId, (f) => ({
        ...f,
        fields: f.fields.filter((fl) => fl.name !== name),
      })),
    [mapForm],
  );

  const reorderFields = useCallback(
    (formId: string, orderedNames: string[]) =>
      mapForm(formId, (f) => ({
        ...f,
        fields: [...f.fields].sort(
          (a, b) => orderedNames.indexOf(a.name) - orderedNames.indexOf(b.name),
        ),
      })),
    [mapForm],
  );

  const resetForms = useCallback(() => {
    const next = [...seedForms];
    setForms(next);
    persist(next);
  }, [persist]);

  const value = useMemo<FormBuilderContextType>(
    () => ({
      forms,
      isReady,
      getForm,
      addForm,
      updateForm,
      deleteForm,
      addField,
      updateField,
      removeField,
      reorderFields,
      resetForms,
    }),
    [
      forms,
      isReady,
      getForm,
      addForm,
      updateForm,
      deleteForm,
      addField,
      updateField,
      removeField,
      reorderFields,
      resetForms,
    ],
  );

  return (
    <FormBuilderContext.Provider value={value}>
      {children}
    </FormBuilderContext.Provider>
  );
};
