import {BrowserContext, Page} from "@playwright/test";
import MatrixApi from "./matrixApi";

const DEFAULT_PASSPHRASE = "defaultPassphrase";

class ChatUtils {
  public async openChat(page: Page) {
    await page.click("button.chat-btn");
  }

  public async openCreateRoomDialog(page: Page,folderName="") {
    await page.getByTestId(`openOptionToCreateRoomOrFolder${folderName}`).click();
    await page.getByTestId(`openCreateRoomModalButton${folderName}`).click();
  }
  public async openCreateFolderDialog(page: Page,folderName="") {
    await page.getByTestId(`openOptionToCreateRoomOrFolder${folderName}`).click();
    await page.getByTestId(`openCreateFolderModalButton${folderName}`).click();
  }

  public getRandomName() {
    return `RoomTest_${Math.floor(Math.random() * 10000)}`;
  }

  public async resetMatrixDatabase() {
    await MatrixApi.resetMatrixUsers();
  }

  public async initEndToEndEncryption(page: Page, context: BrowserContext) {
    // Here, sometimes, SSO redirection is required by the Synapse server, sometimes it is not.
    // It is not clear why, especially since it can change from one test run to another.

    //eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(1000);
    //eslint-disable-next-line playwright/no-element-handle
    const ssoButton = await page.$("text=Continue with SSO");
    if (ssoButton) {
      const oidcPagePromise = context.waitForEvent("page", {
        // Give ample time for the SSO redirection
        timeout: 2000
      });
      await page.getByText("Continue with SSO").click({
        timeout: 1000
      });
      const oidcPage = await oidcPagePromise;
      await oidcPage.getByText("Continue with OIDC Server Mock").click();
      await page.getByText("Finish").click();
      await oidcPage.close();
    }

    await page.getByTestId("passphraseInput").fill(DEFAULT_PASSPHRASE);
    await page.getByText("Generate").click();
    await page.getByTestId("downloadRecoveryKeyButton").click();
    await page.getByText("Continue").click();
  }

  public async cancelledContinueWithSSO(page:Page,context:BrowserContext){
    await page.getByText("Cancel").click();
  }

  public async restoreEncryption(page: Page) {
    await page.getByTestId("passphraseInput").fill(DEFAULT_PASSPHRASE);
    await page.getByText("Confirm").click();
  }

  public async restoreEncryptionFromButton(page: Page) {
    await page.getByTestId("restoreEncryptionButton").click();
    await this.restoreEncryption(page);
  }

  public async closeChat(page: Page) {
    await page.getByTestId("closeChatButton").click();
  }

  public async isChatSidebarOpen(page: Page){
    return page.getByTestId("closeChatButton").isVisible({
      timeout : 20_000
    });
  }

  public async openRoomAreaList(page: Page){
    return page.getByText("Rooms").click();
  }

}

export default new ChatUtils();
