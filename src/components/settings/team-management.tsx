"use client";

import { useState, useEffect } from "react";
import { Loader2, UserPlus, Trash2, Mail } from "lucide-react";
import type { TeamMemberRole, TeamMemberStatus } from "@/lib/supabase/types";

interface TeamMember {
  id: string;
  email: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  accepted_at: string | null;
  invited_at: string;
}

const ROLE_LABELS: Record<TeamMemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const STATUS_STYLES: Record<TeamMemberStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
  accepted: { label: "Active", className: "bg-green-100 text-green-700" },
  declined: { label: "Declined", className: "bg-red-100 text-red-700" },
  removed: { label: "Removed", className: "bg-zinc-100 text-zinc-500" },
};

export function TeamManagement() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamMemberRole>("member");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");

  async function fetchMembers() {
    try {
      const res = await fetch("/api/team/members");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
      }
    } catch (err) {
      console.error("Failed to load team:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
  }, []);

  async function handleInvite() {
    const email = inviteEmail.trim();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setInviting(true);
    setError("");

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to send invite.");
        return;
      }

      setInviteEmail("");
      await fetchMembers();
    } catch {
      setError("Failed to send invite.");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, role: TeamMemberRole) {
    try {
      await fetch("/api/team/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role }),
      });
      await fetchMembers();
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  }

  async function handleRemove(memberId: string) {
    try {
      await fetch("/api/team/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      await fetchMembers();
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <div className="rounded-xl border border-border bg-background p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Invite Team Member</h3>
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@example.com"
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as TeamMemberRole)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            onClick={handleInvite}
            disabled={inviting}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {inviting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Invite
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>

      {/* Member List */}
      {members.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <UserPlus className="mx-auto h-8 w-8 text-muted" />
          <h3 className="mt-3 text-sm font-medium text-foreground">No team members yet</h3>
          <p className="mt-1 text-sm text-muted">
            Invite team members to collaborate on your store analytics.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => {
            const statusInfo = STATUS_STYLES[member.status];
            return (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{member.email}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                      <span className="text-xs text-muted">
                        Invited{" "}
                        {new Date(member.invited_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {member.role !== "owner" && (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(member.id, e.target.value as TeamMemberRole)
                        }
                        className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
                      >
                        {(Object.keys(ROLE_LABELS) as TeamMemberRole[])
                          .filter((r) => r !== "owner")
                          .map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="rounded-lg p-1.5 text-muted transition-colors hover:text-danger"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  {member.role === "owner" && (
                    <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      {ROLE_LABELS.owner}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
