import { test, expect } from '@playwright/test';

const unique = Date.now();
const patientName = `E2E Patient ${unique}`;

test.describe('PMS smoke flow', () => {
  test('login → register patient → book appointment → create invoice', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="login-form"]', { timeout: 30000 });

    await page.fill('#loginUsername', 'admin');
    await page.fill('#loginPassword', 'admin123');
    await page.click('#loginSubmitBtn');

    await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 15000 });
    await expect(page.locator('.dashboard-container')).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => { window.location.hash = 'register'; });
    await page.waitForSelector('[data-testid="register-page"]');

    await page.fill('#name', patientName);
    await page.fill('#father_name', 'Test Father');
    await page.fill('#grandfather_name', 'Test Grandfather');
    await page.selectOption('#gender', 'Male');
    await page.fill('#dob', '1990-05-15');
    await page.fill('#age', '35');
    await page.click('#nextBtn');

    await page.click('#nextBtn');

    await page.fill('#phone_number', `09${String(unique).slice(-8)}`);
    await page.fill('#emergency_name', 'Emergency Contact');
    await page.fill('#emergency_number', '0911223344');

    page.once('dialog', (d) => d.accept());
    await page.click('#submitBtn');

    await page.waitForSelector('#modalOkBtn', { timeout: 15000 });
    await page.click('#modalOkBtn');

    await page.evaluate(() => { window.location.hash = 'appointments'; });
    await page.waitForSelector('[data-testid="appointments-page"]', { timeout: 10000 });
    await page.click('[data-testid="new-appointment-btn"]');
    await page.waitForSelector('#appointmentForm');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);

    await page.waitForFunction(
      (name) => [...document.querySelector('#apptPatientId').options].some((o) => o.text.includes(name)),
      patientName,
      { timeout: 15000 }
    );
    const patientOption = page.locator('#apptPatientId option').filter({ hasText: patientName }).first();
    const patientId = await patientOption.getAttribute('value');
    await page.selectOption('#apptPatientId', patientId);
    await page.fill('#apptDate', dateStr);
    await page.fill('#apptTime', '10:30');
    await page.click('#saveAppointmentBtn');

    await page.waitForSelector('.toast-container .toast', { timeout: 10000 }).catch(() => {});

    await page.evaluate(() => { window.location.hash = 'billing'; });
    await page.waitForSelector('[data-testid="billing-page"]', { timeout: 10000 });
    await page.click('[data-testid="new-invoice-btn"]');
    await page.waitForSelector('#invoiceForm');

    await page.waitForFunction(
      (name) => [...document.querySelector('#invPatientId').options].some((o) => o.text.includes(name)),
      patientName,
      { timeout: 15000 }
    );
    const invPatientOption = page.locator('#invPatientId option').filter({ hasText: patientName }).first();
    const invPatientId = await invPatientOption.getAttribute('value');
    await page.selectOption('#invPatientId', invPatientId);
    await page.fill('.line-desc', 'E2E consultation');
    await page.fill('.line-price', '500');
    await page.click('#invoiceForm button[type="submit"]');

    await expect(page.locator('.invoice-list-item').first()).toBeVisible({ timeout: 15000 });
  });
});
