import { ICustomWorld } from './custom-world';
import config from './../../../playwright.config';
import { Before, After, BeforeAll, AfterAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import {
  chromium,
  ChromiumBrowser,
  firefox,
  FirefoxBrowser,
  webkit,
  WebKitBrowser,
  ConsoleMessage,
} from '@playwright/test';
import { ITestCaseHookParameter } from '@cucumber/cucumber/lib/support_code_library_builder/types';
import { ensureDir } from 'fs-extra';
import { LoginPage } from '../../pages/loginPage';
import { TravelHomePage } from '../../pages/travelerPage/travelerMainPage';

let browser: ChromiumBrowser | FirefoxBrowser | WebKitBrowser;
const tracesDir = 'traces';

declare global {
  // eslint-disable-next-line no-var
  var browser: ChromiumBrowser | FirefoxBrowser | WebKitBrowser;
  var loginpage: any;
  var homePage: any

}

setDefaultTimeout(process.env.PWDEBUG ? -1 : 60 * 1000);

BeforeAll(async function () {
  switch (config.use.browserName) {
    case 'firefox':
      browser = await firefox.launch(config.use);
      break;
    case 'webkit':
      browser = await webkit.launch(config.use);
      break;
    default:
      browser = await chromium.launch(config.use);
  }
  await ensureDir(tracesDir);  

});


Before(async function (this: ICustomWorld, { pickle }: ITestCaseHookParameter) {
    this.startTime = new Date();
    this.testName = pickle.name.replace(/\W/g, '-');
    // customize the [browser context](https://playwright.dev/docs/next/api/class-browser#browsernewcontextoptions)
    this.context = await browser.newContext({
      acceptDownloads: true,
      recordVideo: process.env.PWVIDEO ? { dir: 'screenshots' } : undefined,
      viewport: null,
    });
  
    await this.context.tracing.start({ screenshots: true, snapshots: true });
    this.page = await this.context.newPage();
    this.page.on('console', async (msg: ConsoleMessage) => {
      if (msg.type() === 'log') {
        await this.attach(msg.text());
      }
    });
    this.loginPage = new LoginPage(this.page);
    this.homePage = new TravelHomePage(this.page);
    this.feature = pickle;
  
});

After(async function (this: ICustomWorld, { result }: ITestCaseHookParameter) {
    if (result) {
    await this.attach(`Status: ${result?.status}. Duration:${result.duration?.seconds}s`);

    if (result.status !== Status.PASSED) {
      const image = await this.page?.screenshot();
      image && (await this.attach(image, 'image/png'));
      await this.context?.tracing.stop({
        path: `${tracesDir}/${this.testName}-${
          this.startTime?.toISOString().split('.')[0]
        }trace.zip`,
      });
    }
  }
  await this.page?.close();
  await this.context?.close();
});

AfterAll(async function () {
   await browser.close();
});