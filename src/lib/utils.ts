import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const adjectives = ['swift', 'bright', 'cosmic', 'lunar', 'solar', 'stellar', 'azure', 'crimson', 'emerald', 'golden'];
const nouns = ['phoenix', 'dragon', 'falcon', 'nexus', 'orbit', 'pulse', 'spark', 'wave', 'zenith', 'core'];

export function generateRandomName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective}-${noun}-${Math.floor(Math.random() * 1000)}`;
}

