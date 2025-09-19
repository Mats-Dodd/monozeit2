import * as React from "react"

export interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  title?: string
  strokeWidth?: number
}

export function Logo({
  size = 24,
  className,
  title = "Monozeit logo mark",
  strokeWidth = 2,
  ...props
}: LogoProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
      {...props}
    >
      <title>{title}</title>
      <defs>
        <marker
          id="logo-arrowhead"
          viewBox="0 0 6 6"
          refX="5"
          refY="3"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
        </marker>
      </defs>

      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          vectorEffect: "non-scaling-stroke",
          shapeRendering: "geometricPrecision",
        }}
      >
        <circle cx="32" cy="32" r="22" />
        <circle cx="32" cy="32" r="12" opacity="0.6" />
        <path d="M12 32 H52" markerEnd="url(#logo-arrowhead)" />

        <circle
          cx="21"
          cy="51"
          r="1.2"
          opacity="0.45"
          fill="currentColor"
          stroke="none"
        />
        <circle
          cx="16.44"
          cy="47.56"
          r="1.2"
          opacity="0.45"
          fill="currentColor"
          stroke="none"
        />
        <circle
          cx="12.95"
          cy="43.00"
          r="1.2"
          opacity="0.45"
          fill="currentColor"
          stroke="none"
        />

        <rect
          x="49.55"
          y="19.50"
          width="3"
          height="3"
          fill="currentColor"
          stroke="none"
        />
      </g>
    </svg>
  )
}

export default Logo
