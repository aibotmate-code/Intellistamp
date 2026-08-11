import React from 'react'
import { PublicSocialLinks } from '@/types'
import { Instagram, Facebook, Youtube, MessageCircle, Star, Twitter } from 'lucide-react'

// X icon isn't standard in all lucide-react versions, Twitter is usually safe, or we can use a custom SVG.
// We'll use Twitter icon for X, MessageCircle for WhatsApp, Star for Google Reviews.

interface Props {
  links: PublicSocialLinks | null | undefined
}

export function SocialLinks({ links }: Props) {
  if (!links) return null

  // If all are null, don't render the container
  if (!links.google_review_url && !links.instagram_url && !links.facebook_url && !links.youtube_url && !links.x_url && !links.whatsapp_url) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-4 border-t border-black/10">
      {links.google_review_url && (
        <a 
          href={links.google_review_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          title="Google Reviews"
        >
          <Star className="w-5 h-5" />
        </a>
      )}
      
      {links.instagram_url && (
        <a 
          href={links.instagram_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          title="Instagram"
        >
          <Instagram className="w-5 h-5" />
        </a>
      )}
      
      {links.facebook_url && (
        <a 
          href={links.facebook_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          title="Facebook"
        >
          <Facebook className="w-5 h-5" />
        </a>
      )}
      
      {links.youtube_url && (
        <a 
          href={links.youtube_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          title="YouTube"
        >
          <Youtube className="w-5 h-5" />
        </a>
      )}
      
      {links.x_url && (
        <a 
          href={links.x_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          title="X (Twitter)"
        >
          <Twitter className="w-5 h-5" />
        </a>
      )}
      
      {links.whatsapp_url && (
        <a 
          href={links.whatsapp_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          title="WhatsApp"
        >
          <MessageCircle className="w-5 h-5" />
        </a>
      )}
    </div>
  )
}
