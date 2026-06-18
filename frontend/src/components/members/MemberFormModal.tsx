"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createMember, updateMember, errorMessage } from "@/lib/api";
import {
  collectErrors,
  email as validateEmail,
  isValid,
  required,
  type Errors,
} from "@/lib/validation";
import type { Member, MemberInput } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  member?: Member | null;
}

const empty = { name: "", email: "", phone: "", address: "" };

type FormErrors = Errors<"name" | "email">;

export function MemberFormModal({ open, onClose, onSaved, member }: Props) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const editing = !!member;

  useEffect(() => {
    if (open) {
      setErrors({});
      setForm(
        member
          ? {
              name: member.name,
              email: member.email,
              phone: member.phone ?? "",
              address: member.address ?? "",
            }
          : empty
      );
    }
  }, [open, member]);

  function set<K extends keyof typeof form>(key: K, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => (e[key as keyof FormErrors] ? { ...e, [key]: undefined } : e));
  }

  function validate(): FormErrors {
    return collectErrors<"name" | "email">({
      name: required(form.name, "Name"),
      email: validateEmail(form.email),
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (!isValid(found)) return;
    setLoading(true);
    try {
      const payload: MemberInput = {
        name: form.name.trim(),
        email: form.email.trim(),
      };
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.address.trim()) payload.address = form.address.trim();

      if (editing && member) {
        await updateMember(member.id, payload);
        toast.success("Member updated");
      } else {
        await createMember(payload);
        toast.success("Member added");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, "Could not save member"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit member" : "Add member"}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          error={errors.name}
          required
          placeholder="Ada Lovelace"
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          error={errors.email}
          required
          placeholder="ada@example.com"
        />
        <Input
          label="Phone"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="+1 555 0100"
        />
        <Textarea
          label="Address"
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          rows={2}
          placeholder="123 Library Lane"
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {editing ? "Save changes" : "Add member"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
