import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import type { Business } from '@/types'

export default function SocialLinksSettings({ business }: { business: Business }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [formData, setFormData] = useState({
    google_review_url: '',
    instagram_url: '',
    facebook_url: '',
    youtube_url: '',
    x_url: '',
    whatsapp_number: '',
    whatsapp_message: ''
  })

  useEffect(() => {
    fetch('/api/business/settings/social-links')
      .then(res => res.json())
      .then(data => {
        if (data.social_links) {
          setFormData({
            google_review_url: data.social_links.google_review_url || '',
            instagram_url: data.social_links.instagram_url || '',
            facebook_url: data.social_links.facebook_url || '',
            youtube_url: data.social_links.youtube_url || '',
            x_url: data.social_links.x_url || '',
            whatsapp_number: data.social_links.whatsapp_number || '',
            whatsapp_message: data.social_links.whatsapp_message || ''
          })
        }
      })
      .catch(() => setError('Failed to load social links'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/business/settings/social-links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess('Social links saved successfully')
        if (data.social_links) {
          setFormData({
            google_review_url: data.social_links.google_review_url || '',
            instagram_url: data.social_links.instagram_url || '',
            facebook_url: data.social_links.facebook_url || '',
            youtube_url: data.social_links.youtube_url || '',
            x_url: data.social_links.x_url || '',
            whatsapp_number: data.social_links.whatsapp_number || '',
            whatsapp_message: data.social_links.whatsapp_message || ''
          })
        }
      } else {
        setError(data.error || 'Failed to save social links')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-zinc-500 animate-pulse">Loading settings...</div>
  }

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
      <div className="mb-6">
        <h3 className="font-bold text-white text-lg">Social & Contact Links</h3>
        <p className="text-sm text-zinc-400 mt-1">
          Add your business social profiles. These will appear on the customer loyalty card. Leave blank to hide.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-2">Social Profiles</h4>
            <Input
              name="instagram_url"
              label="Instagram Profile URL"
              placeholder="https://instagram.com/yourbusiness"
              value={formData.instagram_url}
              onChange={handleChange}
            />
            <Input
              name="facebook_url"
              label="Facebook Page URL"
              placeholder="https://facebook.com/yourbusiness"
              value={formData.facebook_url}
              onChange={handleChange}
            />
            <Input
              name="x_url"
              label="X (Twitter) Profile URL"
              placeholder="https://x.com/yourbusiness"
              value={formData.x_url}
              onChange={handleChange}
            />
            <Input
              name="youtube_url"
              label="YouTube Channel URL"
              placeholder="https://youtube.com/@yourbusiness"
              value={formData.youtube_url}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-2">Direct Contact</h4>
            <Input
              name="google_review_url"
              label="Google Review URL"
              placeholder="https://g.page/r/..."
              value={formData.google_review_url}
              onChange={handleChange}
            />
            <Input
              name="whatsapp_number"
              label="WhatsApp Number (with country code)"
              placeholder="+91 9876543210"
              value={formData.whatsapp_number}
              onChange={handleChange}
            />
            <Input
              name="whatsapp_message"
              label="Default WhatsApp Message"
              placeholder="Hi! I have a question about..."
              value={formData.whatsapp_message}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <Button type="submit" loading={saving}>Save Links</Button>
        </div>
      </form>
    </div>
  )
}
