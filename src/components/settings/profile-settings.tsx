"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ProfileSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setEmail(data.profile?.email ?? "");
          setFullName(data.profile?.full_name ?? "");
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  async function handleSaveProfile() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName }),
      });

      if (res.ok) {
        setMessage("Profile updated successfully.");
      } else {
        setError("Failed to update profile.");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setMessage("Password changed successfully.");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setError("Failed to change password.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {message && (
        <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Profile Info */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Profile Information
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-sm text-muted cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-muted">
              Email cannot be changed here.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Change Password
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={saving || !newPassword}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <User className="h-3.5 w-3.5" />
            )}
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
}
