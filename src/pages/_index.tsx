/* eslint-disable @typescript-eslint/no-explicit-any */
import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_index')({
  component: () => (
    <div className='h-dvh w-screen overflow-y-auto'>
      <Outlet />
    </div>
  ),
})