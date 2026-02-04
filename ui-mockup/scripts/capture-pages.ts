import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.join(process.cwd(), 'html');

// Test accounts (from e2e/helpers/auth.helper.ts)
const TEACHER_ACCOUNT = {
  username: 'testteacher2',
  password: 'test12345678'
};

const STUDENT_ACCOUNT = {
  username: 'teststudent2',
  password: 'test12345678'
};

// Page definitions
interface PageDef {
  name: string;
  url: string;
  filename: string;
  category: 'auth' | 'teacher' | 'student' | 'common';
  requiresAuth: boolean;
  role?: 'teacher' | 'student';
}

const PAGES: PageDef[] = [
  // Auth pages (no login required)
  { name: 'Login', url: '/login', filename: 'login.html', category: 'auth', requiresAuth: false },
  { name: 'Register', url: '/register', filename: 'register.html', category: 'auth', requiresAuth: false },

  // Teacher pages
  { name: 'Teacher Dashboard', url: '/dashboard', filename: 'dashboard.html', category: 'teacher', requiresAuth: true, role: 'teacher' },
  { name: 'Questions List', url: '/questions', filename: 'questions-list.html', category: 'teacher', requiresAuth: true, role: 'teacher' },
  { name: 'Question New', url: '/questions/new', filename: 'questions-new.html', category: 'teacher', requiresAuth: true, role: 'teacher' },
  { name: 'Testpapers List', url: '/testpapers', filename: 'testpapers-list.html', category: 'teacher', requiresAuth: true, role: 'teacher' },
  { name: 'Testpaper New', url: '/testpapers/new', filename: 'testpapers-new.html', category: 'teacher', requiresAuth: true, role: 'teacher' },
  { name: 'Examinations List', url: '/examinations', filename: 'examinations-list.html', category: 'teacher', requiresAuth: true, role: 'teacher' },
  { name: 'Examination New', url: '/examinations/new', filename: 'examinations-new.html', category: 'teacher', requiresAuth: true, role: 'teacher' },
  { name: 'Students List', url: '/students', filename: 'students-list.html', category: 'teacher', requiresAuth: true, role: 'teacher' },
  { name: 'Analytics', url: '/analytics', filename: 'analytics.html', category: 'teacher', requiresAuth: true, role: 'teacher' },

  // Student pages
  { name: 'Student Dashboard', url: '/dashboard', filename: 'dashboard.html', category: 'student', requiresAuth: true, role: 'student' },
  { name: 'Exams List', url: '/exams', filename: 'exams-list.html', category: 'student', requiresAuth: true, role: 'student' },
  { name: 'Exam Results List', url: '/exams/results', filename: 'exam-results-list.html', category: 'student', requiresAuth: true, role: 'student' },

  // Common pages (using teacher account)
  { name: 'Profile', url: '/profile', filename: 'profile.html', category: 'common', requiresAuth: true, role: 'teacher' },
  { name: 'Settings', url: '/settings', filename: 'settings.html', category: 'common', requiresAuth: true, role: 'teacher' },
];

async function login(page: Page, role: 'teacher' | 'student'): Promise<void> {
  const account = role === 'teacher' ? TEACHER_ACCOUNT : STUDENT_ACCOUNT;

  console.log(`  Logging in as ${role}...`);
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  await page.fill('input[id="username"]', account.username);
  await page.fill('input[id="password"]', account.password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard (same as e2e helper)
  await page.waitForURL(`${BASE_URL}/`, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  console.log(`  Login successful!`);
}

async function logout(page: Page): Promise<void> {
  // Clear storage to logout
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function inlineStyles(page: Page): Promise<string> {
  // Get all stylesheets and inline them
  const html = await page.evaluate(async () => {
    const stylesheets: string[] = [];

    // Get all linked stylesheets
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    for (const link of links) {
      try {
        const href = (link as HTMLLinkElement).href;
        if (href.startsWith('http://localhost') || href.startsWith('/')) {
          const response = await fetch(href);
          const css = await response.text();
          stylesheets.push(css);
        }
      } catch (e) {
        console.error('Failed to fetch stylesheet:', e);
      }
    }

    // Get inline styles
    const styles = document.querySelectorAll('style');
    for (const style of styles) {
      stylesheets.push(style.textContent || '');
    }

    // Get the HTML
    let htmlContent = document.documentElement.outerHTML;

    // Remove link tags and add inline styles
    const styleTag = `<style>\n${stylesheets.join('\n')}\n</style>`;

    return { htmlContent, styleTag };
  });

  // Inject styles into head
  let finalHtml = html.htmlContent;
  finalHtml = finalHtml.replace(/<link[^>]*rel="stylesheet"[^>]*>/gi, '');
  finalHtml = finalHtml.replace('</head>', `${html.styleTag}\n</head>`);

  // Add meta charset if not present
  if (!finalHtml.includes('charset')) {
    finalHtml = finalHtml.replace('<head>', '<head>\n<meta charset="UTF-8">');
  }

  return finalHtml;
}

async function capturePage(page: Page, pageDef: PageDef): Promise<void> {
  console.log(`  Capturing: ${pageDef.name} (${pageDef.url})`);

  await page.goto(`${BASE_URL}${pageDef.url}`);
  await page.waitForLoadState('networkidle');

  // Wait for animations to complete
  await page.waitForTimeout(1500);

  // Get HTML with inlined styles
  const html = await inlineStyles(page);

  // Save to file
  const outputPath = path.join(OUTPUT_DIR, pageDef.category, pageDef.filename);
  fs.writeFileSync(outputPath, html, 'utf-8');

  console.log(`  Saved: ${outputPath}`);
}

async function captureScreenshot(page: Page, pageDef: PageDef): Promise<void> {
  const screenshotPath = path.join(OUTPUT_DIR, pageDef.category, pageDef.filename.replace('.html', '.png'));
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`  Screenshot: ${screenshotPath}`);
}

async function main(): Promise<void> {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const categoryArg = args.find(arg => arg.startsWith('--category='));
  const filterCategory = categoryArg ? categoryArg.split('=')[1] : null;

  console.log('=== OnlineExam-v2 HTML Capture ===\n');

  // Check if server is running
  try {
    const response = await fetch(BASE_URL);
    if (!response.ok) throw new Error('Server not responding');
  } catch (e) {
    console.error(`Error: Frontend server is not running at ${BASE_URL}`);
    console.error('Please start the dev server: cd frontend && npm run dev');
    process.exit(1);
  }

  console.log(`Server running at ${BASE_URL}\n`);

  // Launch browser
  const browser: Browser = await chromium.launch({ headless: true });

  try {
    // Filter pages by category if specified
    let pagesToCapture = PAGES;
    if (filterCategory) {
      pagesToCapture = PAGES.filter(p => p.category === filterCategory);
      console.log(`Filtering by category: ${filterCategory}\n`);
    }

    // Group pages by role
    const authPages = pagesToCapture.filter(p => !p.requiresAuth);
    const teacherPages = pagesToCapture.filter(p => p.requiresAuth && p.role === 'teacher');
    const studentPages = pagesToCapture.filter(p => p.requiresAuth && p.role === 'student');

    // Capture auth pages (no login needed)
    if (authPages.length > 0) {
      console.log('--- Auth Pages ---');
      const context = await browser.newContext();
      const page = await context.newPage();

      for (const pageDef of authPages) {
        await capturePage(page, pageDef);
        await captureScreenshot(page, pageDef);
      }

      await context.close();
    }

    // Capture teacher pages
    if (teacherPages.length > 0) {
      console.log('\n--- Teacher Pages ---');
      const context = await browser.newContext();
      const page = await context.newPage();

      await login(page, 'teacher');

      for (const pageDef of teacherPages) {
        await capturePage(page, pageDef);
        await captureScreenshot(page, pageDef);
      }

      await context.close();
    }

    // Capture student pages
    if (studentPages.length > 0) {
      console.log('\n--- Student Pages ---');
      const context = await browser.newContext();
      const page = await context.newPage();

      await login(page, 'student');

      for (const pageDef of studentPages) {
        await capturePage(page, pageDef);
        await captureScreenshot(page, pageDef);
      }

      await context.close();
    }

    console.log('\n=== Capture Complete ===');
    console.log(`Output directory: ${OUTPUT_DIR}`);

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
