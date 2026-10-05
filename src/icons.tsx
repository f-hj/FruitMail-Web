import type { ReactNode, SVGProps } from 'react'

export type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function createIcon(children: ReactNode, displayName: string) {
  function Icon({ size = 20, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {children}
      </svg>
    )
  }
  Icon.displayName = displayName
  return Icon
}

/** Pencil, used for "write a mail" / "reply". */
export const NewIcon = createIcon(
  <>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </>,
  'NewIcon',
)

export const ReplyIcon = createIcon(
  <>
    <path d="M9 14L4 9l5-5" />
    <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
  </>,
  'ReplyIcon',
)

export const RefreshIcon = createIcon(
  <>
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </>,
  'RefreshIcon',
)

export const UserIcon = createIcon(
  <>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>,
  'UserIcon',
)

export const PrintIcon = createIcon(
  <>
    <path d="M6 9V2h12v7" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </>,
  'PrintIcon',
)

export const CheckIcon = createIcon(<path d="M20 6L9 17l-5-5" />, 'CheckIcon')

export const AttachmentIcon = createIcon(
  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />,
  'AttachmentIcon',
)

export const ChevronIcon = createIcon(<path d="M9 18l6-6-6-6" />, 'ChevronIcon')
