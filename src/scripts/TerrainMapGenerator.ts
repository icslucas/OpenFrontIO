import PImage from 'pureimage';
import path from 'path';
import fs from 'fs/promises';
import {createReadStream, createWriteStream} from 'fs';
import {fileURLToPath} from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



interface Coord {
    x: number;
    y: number;
}

export class TerrainMap {
    constructor(public readonly tiles: Terrain[][]) { }

    terrain(coord: Coord): Terrain {
        return this.tiles[coord.x][coord.y]
    }

    width(): number {
        return this.tiles.length
    }

    height(): number {
        return this.tiles[0].length
    }
}

export enum TerrainType {
    Land,
    Water
}

export class Terrain {
    public shoreline: boolean = false
    public magnitude: number = 0
    public ocean: boolean
    constructor(public type: TerrainType) { }
}

export async function loadTerrainMap(): Promise<void> {
    const imagePath = path.resolve(__dirname, '..', '..', 'resources', 'maps', 'World.png');

    const readStream = createReadStream(imagePath);
    const img = await PImage.decodePNGFromStream(readStream);

    console.log('Image loaded successfully');
    console.log('Image dimensions:', img.width, 'x', img.height);

    const terrain: Terrain[][] = Array(img.width).fill(null).map(() => Array(img.height).fill(null));

    // Iterate through each pixel
    for (let x = 0; x < img.width; x++) {
        for (let y = 0; y < img.height; y++) {
            const color = img.getPixelRGBA(x, y);
            const alpha = color & 0xff;

            if (alpha < 20) { // transparent
                terrain[x][y] = new Terrain(TerrainType.Water);
            } else {
                terrain[x][y] = new Terrain(TerrainType.Land)
            }
        }
    }


    const shorelineWaters = processShore(terrain)
    processDistToLand(shorelineWaters, terrain)
    processOcean(terrain)
    const packed = packTerrain(terrain)
    const outputPath = path.join(__dirname, '..', '..', 'resources', 'World.bin');
    fs.writeFile(outputPath, packed);
}

function processShore(map: Terrain[][]): Coord[] {
    const shorelineWaters: Coord[] = []
    for (let x = 0; x < map.length; x++) {
        for (let y = 0; y < map[0].length; y++) {
            const terrain = map[x][y]
            const ns = neighbors(x, y, map)
            if (terrain.type == TerrainType.Land) {
                if (ns.filter(t => t.type == TerrainType.Water).length > 0) {
                    terrain.shoreline = true
                }
            } else {
                if (ns.filter(t => t.type == TerrainType.Land).length > 0) {
                    terrain.shoreline = true
                    shorelineWaters.push({x, y})
                }
            }
        }
    }
    return shorelineWaters
}

function processDistToLand(shorelineWaters: Coord[], map: Terrain[][]) {
    const queue: [Coord, number][] = shorelineWaters.map(coord => [coord, 0]);
    const visited = new Set<string>();

    while (queue.length > 0) {
        const [coord, distance] = queue.shift()!;
        const key = `${coord.x},${coord.y}`;

        if (visited.has(key)) continue;
        visited.add(key);

        const terrain = map[coord.x][coord.y];
        if (terrain.type === TerrainType.Water) {
            terrain.magnitude = distance;

            for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                const newX = coord.x + dx;
                const newY = coord.y + dy;

                if (newX >= 0 && newX < map.length && newY >= 0 && newY < map[0].length) {
                    queue.push([{x: newX, y: newY}, distance + 1]);
                }
            }
        }
    }
}

function neighbors(x: number, y: number, map: Terrain[][]): Terrain[] {
    const ns: Terrain[] = []
    if (x > 0) {
        ns.push(map[x - 1][y])
    }
    if (x < map.length - 1) {
        ns.push(map[x + 1][y])
    }
    if (y > 0) {
        ns.push(map[x][y - 1])
    }
    if (y < map[0].length - 1) {
        ns.push(map[x][y + 1])
    }
    return ns
}

function packTerrain(map: Terrain[][]): Uint8Array {
    const width = map.length;
    const height = map[0].length;
    const packedData = new Uint8Array(4 + width * height);

    // Add width and height to the first 4 bytes
    packedData[0] = width & 0xFF;
    packedData[1] = (width >> 8) & 0xFF;
    packedData[2] = height & 0xFF;
    packedData[3] = (height >> 8) & 0xFF;


    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const terrain = map[x][y];
            let packedByte = 0;

            if (terrain.type === TerrainType.Land) {
                packedByte |= 0b10000000;
            }
            if (terrain.shoreline) {
                packedByte |= 0b01000000;
            }
            if (terrain.ocean) {
                packedByte |= 0b00100000;
            }
            packedByte |= Math.min(Math.ceil(terrain.magnitude / 2), 31);

            packedData[4 + y * width + x] = packedByte;
        }
    }
    logBinaryAsBits(packedData)
    return packedData;
}

function processOcean(map: Terrain[][]) {
    const queue: Coord[] = [{x: 0, y: 0}];
    const visited = new Set<string>();

    while (queue.length > 0) {
        const coord = queue.shift()!;
        const key = `${coord.x},${coord.y}`;

        if (visited.has(key)) continue;
        visited.add(key);

        const terrain = map[coord.x][coord.y];
        if (terrain.type === TerrainType.Water) {
            terrain.ocean = true;

            // Check neighbors
            for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                const newX = coord.x + dx;
                const newY = coord.y + dy;

                if (newX >= 0 && newX < map.length && newY >= 0 && newY < map[0].length) {
                    queue.push({x: newX, y: newY});
                }
            }
        }
    }
}

function logBinaryAsBits(data: Uint8Array, length: number = 8) {
    const bits = Array.from(data.slice(0, length))
        .map(b => b.toString(2).padStart(8, '0'))
        .join(' ');
    console.log('Binary data (bits):', bits);
}

await loadTerrainMap()