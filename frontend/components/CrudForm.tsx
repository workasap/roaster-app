"use client";

import { useState } from "react";

export type FieldType = "text" | "number" | "date" | "textarea" | "select";

export interface FieldConfig {
  name: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  transform?: (value: string) => unknown;
  readOnly?: boolean;
  datalistId?: string;
  datalistOptions?: string[];
  computeValue?: (values: Record<string, string>) => string;
}

interface CrudFormProps<T extends object> {
  fields: FieldConfig[];
  initial?: Partial<T> | null;
  onSubmit: (value: Partial<T>) => Promise<void> | void;
  onCancel: () => void;
}

export default function CrudForm<T extends object>({
  fields,
  initial,
  onSubmit,
  onCancel
}: CrudFormProps<T>) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const start: Record<string, string> = {};
    fields.forEach((field) => {
      const current = initial?.[field.name as keyof T];
      start[field.name] = current == null ? "" : String(current);
    });
    return start;
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = fields.reduce<Partial<T>>((acc, field) => {
        const raw = field.readOnly && field.computeValue
          ? field.computeValue(values)
          : values[field.name];
        const transformed = field.transform
          ? field.transform(raw)
          : field.type === "number"
            ? Number(raw || 0)
            : raw;
        (acc as Record<string, unknown>)[field.name] =
          transformed === "" ? null : transformed;
        return acc;
      }, {});
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => {
          const commonProps = {
            id: field.name,
            name: field.name,
            required: field.required,
            value: values[field.name] ?? "",
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
              handleChange(field.name, e.target.value),
            className:
              "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          };

          return (
            <label
              key={field.name}
              htmlFor={field.name}
              className="text-xs font-semibold text-slate-600"
            >
              {field.label}
              {field.type === "textarea" ? (
                <textarea
                  {...commonProps}
                  value={field.readOnly && field.computeValue ? field.computeValue(values) : (values[field.name] ?? "")}
                  rows={3}
                  placeholder={field.placeholder}
                  readOnly={field.readOnly}
                  className={`${commonProps.className} ${field.readOnly ? "bg-slate-50" : ""}`}
                />
              ) : field.type === "select" && field.options ? (
                <select {...commonProps}>
                  <option value="">Select</option>
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  {...commonProps}
                  value={field.readOnly && field.computeValue ? field.computeValue(values) : (values[field.name] ?? "")}
                  type={field.type === "number" ? "number" : field.type || "text"}
                  placeholder={field.placeholder}
                  list={field.datalistId}
                  readOnly={field.readOnly}
                  className={`${commonProps.className} ${field.readOnly ? "bg-slate-50" : ""}`}
                />
              )}
              {field.datalistId && field.datalistOptions && (
                <datalist id={field.datalistId}>
                  {field.datalistOptions.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              )}
            </label>
          );
        })}
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}


