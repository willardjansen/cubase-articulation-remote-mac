import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const EXPRESSION_MAPS_DIR = path.join(process.cwd(), 'expression-maps');

interface MapFile {
  name: string;
  path: string;
  folder: string;
}

// GET /api/expression-maps - List all expression maps
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('file');

  // If file path provided, return the file content
  if (filePath) {
    try {
      const fullPath = path.join(EXPRESSION_MAPS_DIR, filePath);

      // Security: ensure the path is within the expression-maps directory
      if (!fullPath.startsWith(EXPRESSION_MAPS_DIR)) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
      }

      if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      return new NextResponse(content, {
        headers: { 'Content-Type': 'application/xml' }
      });
    } catch (error) {
      return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
    }
  }

  // Otherwise, list all expression maps
  try {
    if (!fs.existsSync(EXPRESSION_MAPS_DIR)) {
      return NextResponse.json({ maps: [], message: 'No expression-maps folder found. Create it and add your .expressionmap files.' });
    }

    const maps: MapFile[] = [];

    function scanDirectory(dir: string, relativePath: string = '') {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath, itemRelativePath);
        } else if (item.endsWith('.expressionmap')) {
          maps.push({
            name: item.replace('.expressionmap', ''),
            path: itemRelativePath,
            folder: relativePath || 'Root'
          });
        }
      }
    }

    scanDirectory(EXPRESSION_MAPS_DIR);

    // Group by folder
    const grouped: Record<string, MapFile[]> = {};
    for (const map of maps) {
      if (!grouped[map.folder]) {
        grouped[map.folder] = [];
      }
      grouped[map.folder].push(map);
    }

    return NextResponse.json({ maps, grouped });
  } catch (error) {
    console.error('Error scanning expression maps:', error);
    return NextResponse.json({ error: 'Failed to scan expression maps' }, { status: 500 });
  }
}
