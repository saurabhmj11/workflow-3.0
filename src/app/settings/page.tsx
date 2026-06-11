'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from '@/hooks/use-toast'
import {
  User,
  Building2,
  Bell,
  Shield,
  Key,
  CheckCircle2,
  Copy,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Monitor,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ──────────────────────────────────────────

interface ProfileData {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
  emailVerified: string | null
  createdAt: string
}

interface OrgData {
  organizationName: string
  timezone: string
  defaultModel: string
  organizationId: string
}

interface NotificationData {
  emailNotifications: boolean
  inAppNotifications: boolean
  executionAlerts: boolean
  approvalAlerts: boolean
  triggerFailureAlerts: boolean
  weeklyDigest: boolean
}

interface ApiKeyData {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  createdAt: string
}

// ─── Profile Tab ────────────────────────────────────

function ProfileTab() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings/profile')
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) {
          setProfile(json.data)
          setName(json.data.name ?? '')
        }
      })
      .catch(() => toast({ title: 'Failed to load profile', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const json = await res.json()
      if (json.ok) {
        setProfile(json.data)
        toast({ title: 'Profile updated' })
      } else {
        toast({ title: 'Failed to update profile', description: json.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to update profile', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }, [name])

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </CardContent>
      </Card>
    )
  }

  if (!profile) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6 text-center text-zinc-500">
          Unable to load profile. Please sign in.
        </CardContent>
      </Card>
    )
  }

  const initials = profile.name
    ? profile.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile.email.slice(0, 2).toUpperCase()

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-zinc-100">Profile Information</CardTitle>
        <CardDescription className="text-zinc-500">Update your personal details and avatar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-gradient-to-br from-violet-600 to-cyan-500 text-white text-xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-zinc-200">{profile.name || 'No name set'}</p>
            <p className="text-xs text-zinc-500">{profile.email}</p>
          </div>
        </div>

        <Separator className="bg-zinc-800" />

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-zinc-300">Display Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
          />
        </div>

        {/* Email (read-only) */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
          <div className="flex items-center gap-2">
            <Input
              id="email"
              value={profile.email}
              readOnly
              className="bg-zinc-800/50 border-zinc-700 text-zinc-400 cursor-not-allowed"
            />
            {profile.emailVerified && (
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs shrink-0 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </Badge>
            )}
          </div>
        </div>

        {/* Role */}
        <div className="space-y-2">
          <Label className="text-zinc-300">Role</Label>
          <div>
            <Badge
              variant="outline"
              className={
                profile.role === 'ADMIN'
                  ? 'border-violet-500/30 text-violet-400'
                  : profile.role === 'VIEWER'
                  ? 'border-zinc-500/30 text-zinc-400'
                  : 'border-cyan-500/30 text-cyan-400'
              }
            >
              {profile.role}
            </Badge>
          </div>
        </div>

        {/* Member since */}
        <div className="space-y-2">
          <Label className="text-zinc-300">Member Since</Label>
          <p className="text-sm text-zinc-400">
            {new Date(profile.createdAt).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-cyan-600 hover:bg-cyan-500 text-white"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Update Profile
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Organization Tab ───────────────────────────────

function OrganizationTab() {
  const [org, setOrg] = useState<OrgData>({
    organizationName: '',
    timezone: 'UTC',
    defaultModel: 'gpt-4o',
    organizationId: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings/organization')
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setOrg(json.data)
      })
      .catch(() => toast({ title: 'Failed to load organization settings', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: org.organizationName,
          timezone: org.timezone,
          defaultModel: org.defaultModel,
        }),
      })
      const json = await res.json()
      if (json.ok) {
        setOrg(json.data)
        toast({ title: 'Organization settings saved' })
      } else {
        toast({ title: 'Failed to save', description: json.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }, [org])

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-zinc-100">Organization Settings</CardTitle>
        <CardDescription className="text-zinc-500">Configure your organization defaults and preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Organization Name */}
        <div className="space-y-2">
          <Label htmlFor="orgName" className="text-zinc-300">Organization Name</Label>
          <Input
            id="orgName"
            value={org.organizationName}
            onChange={(e) => setOrg({ ...org, organizationName: e.target.value })}
            placeholder="Enter organization name"
            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
          />
        </div>

        {/* Organization ID (read-only) */}
        <div className="space-y-2">
          <Label className="text-zinc-300">Organization ID</Label>
          <div className="flex items-center gap-2">
            <Input
              value={org.organizationId}
              readOnly
              className="bg-zinc-800/50 border-zinc-700 text-zinc-400 font-mono text-sm cursor-not-allowed"
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-zinc-400 hover:text-zinc-200"
              onClick={() => {
                navigator.clipboard.writeText(org.organizationId)
                toast({ title: 'Copied to clipboard' })
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator className="bg-zinc-800" />

        {/* Timezone */}
        <div className="space-y-2">
          <Label className="text-zinc-300">Default Timezone</Label>
          <Select value={org.timezone} onValueChange={(v) => setOrg({ ...org, timezone: v })}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="UTC">UTC</SelectItem>
              <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
              <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
              <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
              <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
              <SelectItem value="Europe/London">London (GMT)</SelectItem>
              <SelectItem value="Europe/Berlin">Central European (CET)</SelectItem>
              <SelectItem value="Asia/Tokyo">Japan (JST)</SelectItem>
              <SelectItem value="Asia/Shanghai">China (CST)</SelectItem>
              <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Default AI Model */}
        <div className="space-y-2">
          <Label className="text-zinc-300">Default AI Model</Label>
          <Select value={org.defaultModel} onValueChange={(v) => setOrg({ ...org, defaultModel: v })}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
              <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
              <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
              <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
              <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
              <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
              <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-600">This model will be used as the default for new AI nodes</p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-cyan-600 hover:bg-cyan-500 text-white"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Organization
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Notifications Tab ──────────────────────────────

function NotificationToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-zinc-200 cursor-pointer">{label}</Label>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState<NotificationData>({
    emailNotifications: true,
    inAppNotifications: true,
    executionAlerts: true,
    approvalAlerts: true,
    triggerFailureAlerts: true,
    weeklyDigest: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings/notifications')
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setPrefs(json.data)
      })
      .catch(() => toast({ title: 'Failed to load notification preferences', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      const json = await res.json()
      if (json.ok) {
        setPrefs(json.data)
        toast({ title: 'Notification preferences saved' })
      } else {
        toast({ title: 'Failed to save', description: json.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }, [prefs])

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-zinc-100">Notification Preferences</CardTitle>
        <CardDescription className="text-zinc-500">Choose how and when you want to be notified</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <NotificationToggle
          id="emailNotif"
          label="Email Notifications"
          description="Receive notifications via email"
          checked={prefs.emailNotifications}
          onCheckedChange={(v) => setPrefs({ ...prefs, emailNotifications: v })}
        />
        <Separator className="bg-zinc-800" />
        <NotificationToggle
          id="inAppNotif"
          label="In-App Notifications"
          description="Show notifications within the app"
          checked={prefs.inAppNotifications}
          onCheckedChange={(v) => setPrefs({ ...prefs, inAppNotifications: v })}
        />
        <Separator className="bg-zinc-800" />
        <NotificationToggle
          id="execAlerts"
          label="Execution Alerts"
          description="Notify when workflow executions complete or fail"
          checked={prefs.executionAlerts}
          onCheckedChange={(v) => setPrefs({ ...prefs, executionAlerts: v })}
        />
        <Separator className="bg-zinc-800" />
        <NotificationToggle
          id="approvalAlerts"
          label="Approval Alerts"
          description="Notify when workflows require human approval"
          checked={prefs.approvalAlerts}
          onCheckedChange={(v) => setPrefs({ ...prefs, approvalAlerts: v })}
        />
        <Separator className="bg-zinc-800" />
        <NotificationToggle
          id="triggerAlerts"
          label="Trigger Failure Alerts"
          description="Notify when a trigger fails to fire"
          checked={prefs.triggerFailureAlerts}
          onCheckedChange={(v) => setPrefs({ ...prefs, triggerFailureAlerts: v })}
        />
        <Separator className="bg-zinc-800" />
        <NotificationToggle
          id="weeklyDigest"
          label="Weekly Digest"
          description="Receive a weekly summary of activity"
          checked={prefs.weeklyDigest}
          onCheckedChange={(v) => setPrefs({ ...prefs, weeklyDigest: v })}
        />

        <div className="pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Security Tab ───────────────────────────────────

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleChangePassword = useCallback(async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }
    if (newPassword.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })
      const json = await res.json()
      if (json.ok) {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        toast({ title: 'Password changed successfully' })
      } else {
        toast({ title: 'Failed to change password', description: json.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to change password', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }, [currentPassword, newPassword, confirmPassword])

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Change Password</CardTitle>
          <CardDescription className="text-zinc-500">Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-zinc-300">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-zinc-500 hover:text-zinc-300"
                onClick={() => setShowCurrent(!showCurrent)}
              >
                {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-zinc-300">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 8 characters)"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-zinc-500 hover:text-zinc-300"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-zinc-300">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-zinc-500 hover:text-zinc-300"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Active Sessions</CardTitle>
          <CardDescription className="text-zinc-500">Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-sm text-zinc-200">Current Session</p>
                <p className="text-xs text-zinc-500">This device &middot; Active now</p>
              </div>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">Active</Badge>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/50">
                Sign Out All Other Devices
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-zinc-900 border-zinc-800">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-zinc-100">Sign out all other devices?</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400">
                  This will sign you out of all other active sessions. You will need to sign in again on those devices.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300">Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-red-600 hover:bg-red-500 text-white">Sign Out All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── API Keys Tab ───────────────────────────────────

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKeyData[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/api-keys')
      const json = await res.json()
      if (json.ok) setKeys(json.data)
    } catch {
      toast({ title: 'Failed to load API keys', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadKeys()
  }, [loadKeys])

  const handleGenerate = useCallback(async () => {
    if (!newKeyName.trim()) {
      toast({ title: 'API key name is required', variant: 'destructive' })
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      const json = await res.json()
      if (json.ok) {
        setNewKeyName('')
        setNewlyCreatedKey(json.data.key)
        loadKeys()
        toast({ title: 'API key generated', description: 'Make sure to copy it — it won\'t be shown again!' })
      } else {
        toast({ title: 'Failed to generate API key', description: json.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to generate API key', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }, [newKeyName, loadKeys])

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/settings/api-keys?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.ok) {
        setKeys(keys.filter((k) => k.id !== id))
        toast({ title: 'API key revoked' })
      } else {
        toast({ title: 'Failed to revoke API key', description: json.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to revoke API key', variant: 'destructive' })
    }
  }, [keys])

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Newly created key display */}
      {newlyCreatedKey && (
        <Card className="bg-zinc-900 border-emerald-500/30">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <Key className="h-4 w-4 text-emerald-400" />
              New API Key Created
            </CardTitle>
            <CardDescription className="text-amber-400 font-medium">
              Copy this key now — it will not be shown again!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-zinc-800 p-3 rounded-md text-sm text-emerald-300 font-mono border border-zinc-700 overflow-x-auto">
                {newlyCreatedKey}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-zinc-400 hover:text-zinc-200"
                onClick={() => {
                  navigator.clipboard.writeText(newlyCreatedKey)
                  toast({ title: 'Copied to clipboard' })
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              className="mt-2 text-zinc-500 hover:text-zinc-300"
              onClick={() => setNewlyCreatedKey(null)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generate new key */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Generate New API Key</CardTitle>
          <CardDescription className="text-zinc-500">Create a new key for programmatic access to the OpenWorkflow API</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g., Production, Staging)"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <Button
              onClick={handleGenerate}
              disabled={creating || !newKeyName.trim()}
              className="bg-cyan-600 hover:bg-cyan-500 text-white shrink-0"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </div>
          <p className="text-xs text-zinc-600 mt-2">You can create up to 10 API keys</p>
        </CardContent>
      </Card>

      {/* Existing keys list */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Your API Keys</CardTitle>
          <CardDescription className="text-zinc-500">{keys.length} key{keys.length !== 1 ? 's' : ''} registered</CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">No API keys yet</p>
              <p className="text-xs text-zinc-600">Generate one above to get started</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-200 truncate">{key.name}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <code className="text-xs text-zinc-500 font-mono">{key.keyPrefix}{'•'.repeat(16)}</code>
                      <span className="text-xs text-zinc-600">
                        Created {new Date(key.createdAt).toLocaleDateString()}
                      </span>
                      {key.lastUsedAt && (
                        <span className="text-xs text-zinc-600">
                          Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-zinc-100">Revoke API Key?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                          This will permanently revoke the key &quot;{key.name}&quot;. Any application using this key will lose access immediately.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-500 text-white"
                          onClick={() => handleDelete(key.id)}
                        >
                          Revoke Key
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Settings Page ────────────────────────────

function SettingsContent() {
  return (
    <div className="max-w-3xl mx-auto w-full p-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800 w-full justify-start h-auto p-1 gap-1">
            <TabsTrigger
              value="profile"
              className="data-[state=active]:bg-zinc-800 data-[state=active]:text-cyan-400 text-zinc-400 gap-1.5 text-xs sm:text-sm"
            >
              <User className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger
              value="organization"
              className="data-[state=active]:bg-zinc-800 data-[state=active]:text-cyan-400 text-zinc-400 gap-1.5 text-xs sm:text-sm"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Organization</span>
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:bg-zinc-800 data-[state=active]:text-cyan-400 text-zinc-400 gap-1.5 text-xs sm:text-sm"
            >
              <Bell className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="data-[state=active]:bg-zinc-800 data-[state=active]:text-cyan-400 text-zinc-400 gap-1.5 text-xs sm:text-sm"
            >
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger
              value="api-keys"
              className="data-[state=active]:bg-zinc-800 data-[state=active]:text-cyan-400 text-zinc-400 gap-1.5 text-xs sm:text-sm"
            >
              <Key className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">API Keys</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileTab />
          </TabsContent>
          <TabsContent value="organization">
            <OrganizationTab />
          </TabsContent>
          <TabsContent value="notifications">
            <NotificationsTab />
          </TabsContent>
          <TabsContent value="security">
            <SecurityTab />
          </TabsContent>
          <TabsContent value="api-keys">
            <ApiKeysTab />
          </TabsContent>
        </Tabs>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  )
}
