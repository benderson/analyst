import { NextRequest, NextResponse } from 'next/server';

// Generate a simple avatar SVG based on the name
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: encodedName } = await params;
  const name = decodeURIComponent(encodedName);
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  // Generate a color based on the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const color = `hsl(${hue}, 70%, 50%)`;
  const bgColor = `hsl(${hue}, 70%, 90%)`;
  
  const svg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="${bgColor}" />
      <text x="100" y="100" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="${color}" text-anchor="middle" dominant-baseline="middle">
        ${initials}
      </text>
    </svg>
  `;
  
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}