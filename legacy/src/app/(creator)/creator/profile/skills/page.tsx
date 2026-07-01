"use client";

import { useState, useEffect, useRef } from "react";
import { Tag, Save, Plus, X, Clock, Briefcase } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { FormField } from "@/components/shared/form-field";
import { TierBadge } from "@/components/shared/tier-badge";
import { SkeletonPage } from "@/components/shared/loading-skeleton";

type GuildTier = "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE";

const SKILL_CATEGORIES: {
  key: string;
  label: string;
  color: string;
  skills: string[];
}[] = [
  {
    key: "creative",
    label: "Créatif",
    color: "text-purple-400",
    skills: [
      "design",
      "copywriting",
      "video",
      "photography",
      "illustration",
      "motion-design",
      "3D",
      "animation",
      "branding",
    ],
  },
  {
    key: "technical",
    label: "Technique",
    color: "text-blue-400",
    skills: [
      "web",
      "social-media",
      "print",
      "UX/UI",
      "community-management",
      "SEO",
    ],
  },
  {
    key: "strategic",
    label: "Stratégique",
    color: "text-amber-400",
    skills: [
      "planning",
      "research",
      "analytics",
      "data-analysis",
      "strategie",
      "PR",
    ],
  },
];

const ALL_CATEGORIZED_SKILLS = SKILL_CATEGORIES.flatMap((c) => c.skills);

function getSkillCategory(skill: string): string | null {
  for (const cat of SKILL_CATEGORIES) {
    if (cat.skills.includes(skill)) return cat.key;
  }
  return null;
}

export default function SkillsPage() {
  const profile = trpc.guilde.getMyProfile.useQuery();
  const updateProfile = trpc.guilde.updateProfile.useMutation({
    onSuccess: () => profile.refetch(),
  });

  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (profile.data && mountedRef.current) {
      setSkills((profile.data.skills as unknown as string[]) ?? []);
    }
  }, [profile.data]);

  if (profile.isLoading) return <SkeletonPage />;

  const tier = (profile.data?.tier ?? "APPRENTI") as GuildTier;

  const addSkill = (skill: string) => {
    const trimmed = skill.trim().toLowerCase();
    if (!trimmed) {
      setNewSkill("");
      return;
    }
    if (skills.some((s) => s.toLowerCase() === trimmed)) {
      setDuplicateWarning(`"${trimmed}" est deja dans votre liste`);
      setTimeout(() => {
        if (mountedRef.current) setDuplicateWarning("");
      }, 2500);
      setNewSkill("");
      return;
    }
    setDuplicateWarning("");
    setSkills((prev) => [...prev, trimmed]);
    setNewSkill("");
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile.mutateAsync({ skills });
    } finally {
      setIsSaving(false);
    }
  };

  // Group current skills by category
  const skillsByCategory = SKILL_CATEGORIES.map((cat) => ({
    ...cat,
    current: skills.filter((s) => cat.skills.includes(s)),
    available: cat.skills.filter((s) => !skills.includes(s)),
  }));

  const uncategorizedSkills = skills.filter(
    (s) => !ALL_CATEGORIZED_SKILLS.includes(s)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compétences"
        description="Gérez vos compétences et spécialités"
        breadcrumbs={[
          { label: "Creator", href: "/creator" },
          { label: "Profil" },
          { label: "Compétences" },
        ]}
      >
        <TierBadge tier={tier} size="lg" />
      </PageHeader>

      {/* Current skills as tag chips */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
        <h3 className="mb-3 font-semibold text-white">Vos compétences actuelles</h3>
        {skills.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Aucune compétence ajoutée. Sélectionnez des compétences ci-dessous.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-400/15 px-3 py-1 text-sm font-medium text-blue-400 ring-1 ring-inset ring-blue-400/30"
              >
                {skill}
                <button
                  onClick={() => removeSkill(skill)}
                  className="rounded-full p-0.5 transition-colors hover:bg-blue-400/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add skill input */}
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill(newSkill);
              }
            }}
            placeholder="Ajouter une compétence..."
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
          />
          <button
            onClick={() => addSkill(newSkill)}
            disabled={!newSkill.trim()}
            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {duplicateWarning && (
          <p className="mt-1 text-xs text-amber-400">{duplicateWarning}</p>
        )}
      </div>

      {/* Skills organized by category */}
      <div className="space-y-4">
        {skillsByCategory.map((cat) => (
          <div
            key={cat.key}
            className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5"
          >
            <h3 className={`mb-3 text-sm font-semibold ${cat.color}`}>
              {cat.label}
            </h3>

            {/* Already selected in this category */}
            {cat.current.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {cat.current.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-sm font-medium text-zinc-200 ring-1 ring-inset ring-zinc-700"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="rounded-full p-0.5 transition-colors hover:bg-zinc-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Available to add */}
            {cat.available.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {cat.available.map((s) => (
                  <button
                    key={s}
                    onClick={() => addSkill(s)}
                    className="rounded-full border border-dashed border-zinc-700 px-2.5 py-0.5 text-xs text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-300"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Uncategorized skills */}
        {uncategorizedSkills.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
            <h3 className="mb-3 text-sm font-semibold text-zinc-400">Autres</h3>
            <div className="flex flex-wrap gap-2">
              {uncategorizedSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-sm font-medium text-zinc-200 ring-1 ring-inset ring-zinc-700"
                >
                  {skill}
                  <button
                    onClick={() => removeSkill(skill)}
                    className="rounded-full p-0.5 transition-colors hover:bg-zinc-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {isSaving ? "Sauvegarde..." : "Sauvegarder les compétences"}
      </button>
    </div>
  );
}
