import React from 'react'
import { PublicSocialLinks } from '@/types'
import { MessageCircle, Star } from 'lucide-react'

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
)

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
)

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
)

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
)

interface Props {
  links: PublicSocialLinks | {
    google_review_url?: string | null
    instagram_url?: string | null
    facebook_url?: string | null
    youtube_url?: string | null
    x_url?: string | null
    whatsapp_url?: string | null
    whatsapp_number?: string | null
  } | null | undefined
}

export function SocialLinks({ links }: Props) {
  if (!links) return null

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
          <InstagramIcon className="w-5 h-5" />
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
          <FacebookIcon className="w-5 h-5" />
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
          <YoutubeIcon className="w-5 h-5" />
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
          <TwitterIcon className="w-5 h-5" />
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
