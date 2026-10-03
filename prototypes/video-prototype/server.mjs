import http from 'node:http';
import { readFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4177);
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
let exporting = false;
let progress = { frame: 0, total: 0 };

async function jsonBody(request) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 30 * 1024 * 1024) throw new Error('Images exceed the 30 MB upload limit.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}

// Renders the loop into `dir` and returns the file to send back.
async function renderVideo(input, dir) {
  const width = input.width;
  if (![1920, 2560, 3840].includes(width)) throw new Error('Choose 1080p, 1440p or 4K.');
  const config = input.config;
  if (!config || typeof config !== 'object') throw new Error('Missing motion settings.');
  const duration = Number(config.cycleSeconds);
  if (!Number.isFinite(duration) || duration < 8 || duration > 60) throw new Error('Loop length must be 8–60 seconds.');
  // "container" crops the video to the container, dropping the video padding around it.
  const area = input.area === 'container' ? 'container' : 'full';
  const outer = area === 'container' ? Number(config.outerPadding) : 0;
  if (!Number.isFinite(outer) || outer < 0 || outer > 80) throw new Error('Video padding must be 0–80.');
  // MP4 cannot be see-through, so a backdrop-free export becomes two transparent files instead:
  // WebM for Chrome and Firefox, HEVC .mov for Safari.
  const transparent = input.transparent === true;
  const density = width / 960;
  // H.264 needs even dimensions; the crop gives up at most a pixel of height for that.
  const height = area === 'container' ? Math.floor((562.5 - 2 * outer) * 960 / (1000 - 2 * outer) * density / 2) * 2 : Math.round(width * 9 / 16);
  const fps = 30;
  const total = Math.round(duration * fps);
  progress = { frame: 0, total };
  const browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--hide-scrollbars'] });
  let encoder;
  try {
    const context = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: density, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/?capture${area === 'container' ? '=container' : ''}${transparent ? '&transparent' : ''}`, { waitUntil: 'load' });
    await page.evaluate(async settings => {
      window.setPrototypeConfig(settings);
      await window.prototypeReady;
      await document.getElementById('notificationBottle').decode();
      if (!settings.background.startsWith('#')) {
        const image = new Image();
        image.src = settings.background;
        await image.decode();
      }
      window.renderFrame(0);
    }, config);
    const stage = page.locator('#stage');
    const source = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', 'pipe:0'];
    const scale = `scale=${width}:${height}:flags=lanczos`;
    const webm = path.join(dir, 'sip-motion.webm');
    const mov = path.join(dir, 'sip-motion.mov');
    const mp4 = path.join(dir, 'sip-motion.mp4');
    const ffmpegArgs = transparent
      ? [...source, '-filter_complex', `[0:v]${scale},split=2[webm][mov]`,
        '-map', '[webm]', '-an', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-crf', '24', '-b:v', '0', '-auto-alt-ref', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '3', webm,
        '-map', '[mov]', '-an', '-c:v', 'hevc_videotoolbox', '-allow_sw', '1', '-alpha_quality', '0.9', '-q:v', '62', '-pix_fmt', 'bgra', '-tag:v', 'hvc1', '-movflags', '+faststart', mov]
      : [...source, '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-vf', scale, '-movflags', '+faststart', mp4];
    encoder = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
    let encoderError = '';
    encoder.stderr.on('data', chunk => { encoderError += chunk.toString(); });
    for (let frame = 0; frame < total; frame++) {
      await page.evaluate(time => window.renderFrame(time), frame / fps);
      const image = area === 'container' ? await page.screenshot({ type: 'png', timeout: 30000, omitBackground: transparent, clip: { x: 0, y: 0, width: 960, height: height / density } }) : await stage.screenshot({ type: 'png', timeout: 30000, omitBackground: transparent });
      await new Promise((resolve, reject) => encoder.stdin.write(image, error => error ? reject(error) : resolve()));
      progress.frame = frame + 1;
    }
    encoder.stdin.end();
    const [code] = await once(encoder, 'close');
    if (code !== 0) throw new Error(encoderError || `FFmpeg exited with code ${code}.`);
    if (!transparent) return { file: mp4, type: 'video/mp4' };
    const archive = path.join(dir, 'sip-motion.zip');
    const [zipCode] = await once(spawn('zip', ['-j', '-q', '-0', archive, webm, mov], { stdio: 'ignore' }), 'close');
    if (zipCode !== 0) throw new Error(`zip exited with code ${zipCode}.`);
    return { file: archive, type: 'application/zip' };
  } finally {
    if (encoder && !encoder.killed && encoder.exitCode === null) encoder.kill();
    await browser.close();
  }
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === 'GET' && request.url === '/progress') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(progress));
      return;
    }
    if (request.method === 'POST' && request.url === '/export') {
      if (exporting) { response.writeHead(429); response.end('An export is already running.'); return; }
      exporting = true;
      let dir;
      try {
        const input = await jsonBody(request);
        dir = await mkdtemp(path.join(tmpdir(), 'sip-motion-'));
        const { file, type } = await renderVideo(input, dir);
        const info = await stat(file);
        response.writeHead(200, { 'content-type': type, 'content-length': info.size, 'content-disposition': `attachment; filename="${path.basename(file)}"` });
        await new Promise((resolve, reject) => { const stream = createReadStream(file); stream.on('error', reject); response.on('close', resolve); stream.pipe(response); });
      } finally {
        exporting = false;
        progress = { frame: 0, total: 0 };
        if (dir) await rm(dir, { recursive: true, force: true });
      }
      return;
    }
    if (request.method !== 'GET') { response.writeHead(405); response.end(); return; }
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const fullPath = path.resolve(root, `.${relative}`);
    if (!fullPath.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
    const contents = await readFile(fullPath);
    response.writeHead(200, { 'content-type': mime[path.extname(fullPath)] || 'application/octet-stream' });
    response.end(contents);
  } catch (error) {
    if (!response.headersSent) response.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(error.message || String(error));
    if (error.code !== 'ENOENT') console.error(error);
  }
});

server.listen(port, '127.0.0.1', () => console.log(`Sip motion prototype: http://127.0.0.1:${port}`));
