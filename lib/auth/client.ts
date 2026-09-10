'use client'

import { createAuthClient } from 'better-auth/react'

const authClient = createAuthClient({ baseURL: process.env.NEXT_PUBLIC_BASIS_URL })
export const { signIn, signOut, signUp, useSession } = authClient
