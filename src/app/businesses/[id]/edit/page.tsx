'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getBusinessProfileById, updateBusinessProfile } from "@/actions/business";
import type { BusinessProfile, LinkedDirector } from "@/types/business";

export default function EditBusinessPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params?.id as string;
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [manualFounderName, setManualFounderName] = useState("");
  const [manualFounderTitle, setManualFounderTitle] = useState("Founder");

  useEffect(() => {
    if (!businessId) return;
    setProfile(null);
    setError("");
    getBusinessProfileById(businessId).then((result) => {
      if (!result.profile || !result.isOwner) {
        if (!result.isAuthenticated) {
          router.replace(`/login?redirect=${encodeURIComponent(`/businesses/${businessId}/edit`)}`);
          return;
        }
        setError("Only the current business manager can edit this profile.");
        return;
      }
      setProfile(result.profile);
    }).catch(() => setError("Unable to load this business profile."));
  }, [businessId]);

  const set = (field: keyof BusinessProfile, value: string) => setProfile((current) => current ? { ...current, [field]: value } : current);
  const setDirectors = (linkedDirectors: LinkedDirector[]) => setProfile((current) => current ? { ...current, linkedDirectors } : current);
  const setPrimaryContact = (index: number) => setDirectors((profile?.linkedDirectors || []).map((director, directorIndex) => ({ ...director, isPrimaryContact: directorIndex === index })));
  const removeDirector = (index: number) => {
    const remaining = (profile?.linkedDirectors || []).filter((_, directorIndex) => directorIndex !== index);
    if (!remaining.some((director) => director.isPrimaryContact)) {
      const nextPrimary = remaining.find((director) => director.source === "directory" && director.memberId);
      if (nextPrimary) nextPrimary.isPrimaryContact = true;
    }
    setDirectors(remaining);
  };
  const addManualFounder = () => {
    const name = manualFounderName.trim();
    if (!name) return;
    setDirectors([...(profile?.linkedDirectors || []), { source: "manual", name, roleTitle: manualFounderTitle.trim() || "Founder", isPrimaryContact: false }]);
    setManualFounderName("");
    setManualFounderTitle("Founder");
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setSaving(true); setError("");
    const result = await updateBusinessProfile(profile.id, {
      businessName: profile.businessName, tagline: profile.tagline, aboutBusiness: profile.aboutBusiness,
      offeringsSummary: profile.offeringsSummary, contactPhone: profile.contactPhone, contactEmail: profile.contactEmail,
      websiteUrl: profile.websiteUrl, country: profile.country, state: profile.state, city: profile.city,
      pincode: profile.pincode, addressLine: profile.addressLine, linkedDirectors: profile.linkedDirectors,
    });
    setSaving(false);
    if (!result.success) { setError(result.error || "Unable to save this business profile."); return; }
    router.push(`/businesses/${profile.id}`);
    router.refresh();
  };

  if (error && !profile) return <main className="min-h-[60vh] p-8 text-center"><p className="text-sm text-red-700">{error}</p><Link href="/dashboard" className="mt-4 inline-block text-sm text-brand-primary underline">Back to dashboard</Link></main>;
  if (!profile) return <main className="min-h-[60vh] p-8 text-center text-sm text-body-muted">Loading business profile…</main>;

  return <main className="min-h-screen bg-canvas-page px-4 py-8"><form onSubmit={submit} className="mx-auto max-w-2xl space-y-5 rounded-3xl border border-brand-accent/30 bg-white p-6 shadow-warm">
    <div><Link href={`/businesses/${profile.id}`} className="text-xs font-semibold text-brand-primary">← Back to business</Link><h1 className="mt-2 text-2xl font-bold text-brand-primary">Edit business profile</h1><p className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">You manage this business</p><p className="text-xs text-body-muted">Only the current manager can save these changes. A rejected listing returns to review after editing.</p></div>
    {error && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    <Field label="Business name" value={profile.businessName} onChange={(v) => set("businessName", v)} required />
    <Field label="Tagline" value={profile.tagline || ""} onChange={(v) => set("tagline", v)} />
    <TextArea label="About the business" value={profile.aboutBusiness} onChange={(v) => set("aboutBusiness", v)} required />
    <TextArea label="Products and services" value={profile.offeringsSummary || ""} onChange={(v) => set("offeringsSummary", v)} />
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Business phone" value={profile.contactPhone || ""} onChange={(v) => set("contactPhone", v)} /><Field label="Business email" type="email" value={profile.contactEmail || ""} onChange={(v) => set("contactEmail", v)} /><Field label="Website" value={profile.websiteUrl || ""} onChange={(v) => set("websiteUrl", v)} /><Field label="Country" value={profile.country} onChange={(v) => set("country", v)} /></div>
    <div className="grid gap-3 sm:grid-cols-3"><Field label="State" value={profile.state} onChange={(v) => set("state", v)} required /><Field label="City" value={profile.city} onChange={(v) => set("city", v)} required /><Field label="Postal code" value={profile.pincode || ""} onChange={(v) => set("pincode", v)} /></div>
    <Field label="Address" value={profile.addressLine || ""} onChange={(v) => set("addressLine", v)} />
    <section className="space-y-3 rounded-2xl border border-brand-accent/20 bg-canvas-warm/40 p-4">
      <div><h2 className="text-sm font-bold text-brand-primary">Leadership & Governance</h2><p className="text-xs text-body-muted">The registering manager is the default contact. Add public founders after registration.</p></div>
      {profile.linkedDirectors.map((director, index) => <div key={`${director.memberId || director.name}-${index}`} className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 text-xs">
        <span className="min-w-32 font-semibold text-body-heading">{director.name}</span>
        <input value={director.roleTitle} onChange={(event) => setDirectors(profile.linkedDirectors.map((item, itemIndex) => itemIndex === index ? { ...item, roleTitle: event.target.value } : item))} className="rounded-lg border border-brand-accent/30 px-2 py-1" aria-label={`${director.name} role`} />
        {director.source === "directory" && <label className="flex items-center gap-1"><input type="radio" name="primaryContact" checked={director.isPrimaryContact} onChange={() => setPrimaryContact(index)} /> Primary contact</label>}
        {profile.linkedDirectors.length > 1 && <button type="button" onClick={() => removeDirector(index)} className="text-red-700 underline">Remove</button>}
      </div>)}
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input value={manualFounderName} onChange={(event) => setManualFounderName(event.target.value)} placeholder="Founder name" className="rounded-xl border border-brand-accent/30 px-3 py-2 text-sm" /><input value={manualFounderTitle} onChange={(event) => setManualFounderTitle(event.target.value)} placeholder="Role title" className="rounded-xl border border-brand-accent/30 px-3 py-2 text-sm" /><button type="button" onClick={addManualFounder} className="rounded-full border border-brand-accent/40 px-3 py-2 text-xs font-semibold text-brand-primary">Add founder</button></div>
    </section>
    <button disabled={saving} className="rounded-full px-5 py-2 text-sm font-bold text-white va-btn-join disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button>
  </form></main>;
}

function Field({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) { return <label className="block text-xs font-semibold text-body-heading">{label}<input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-brand-accent/30 px-3 py-2 text-sm" /></label>; }
function TextArea({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) { return <label className="block text-xs font-semibold text-body-heading">{label}<textarea required={required} value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-brand-accent/30 px-3 py-2 text-sm" /></label>; }
