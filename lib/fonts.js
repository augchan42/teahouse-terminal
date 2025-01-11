import { Space_Mono, Noto_Sans_HK } from 'next/font/google';
import { Courier_Prime } from 'next/font/google';
import { IBM_Plex_Mono } from 'next/font/google';

export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-ibm-typewriter',
});

export const courierPrime = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-courier-typewriter',
});

// Monospace for terminal feel
export const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-terminal',
});

// Traditional Chinese font
export const notoSansHK = Noto_Sans_HK({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-chinese',
});

