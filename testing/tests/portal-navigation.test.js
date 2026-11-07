const fs = require('fs');
const path = require('path');

const frontendRoot = path.resolve(__dirname, '..', '..', 'frontend');

describe('入口導覽', () => {
  test('後台側邊選單提供儀表板入口', () => {
    const app = fs.readFileSync(path.join(frontendRoot, 'pages', '_app.js'), 'utf8');
    expect(app).toMatch(/href: '\/dashboard', label: '儀表板'/);
  });

  test('店家顧客入口提供店家登入連結', () => {
    const shopEntry = fs.readFileSync(path.join(frontendRoot, 'pages', 's', '[code].js'), 'utf8');
    expect(shopEntry).toMatch(/className="portal-footer shop-home-staff-footer"/);
    expect(shopEntry).toMatch(/className="portal-staff-link" href="\/login"/);
    expect(shopEntry).toContain('店家登入');
  });

  test('員工活動回報並只在儀表板顯示 OWNER 可看的在線名單', () => {
    const app = fs.readFileSync(path.join(frontendRoot, 'pages', '_app.js'), 'utf8');
    const dashboard = fs.readFileSync(path.join(frontendRoot, 'pages', 'dashboard.js'), 'utf8');
    expect(app).toContain('recordStaffActivity');
    expect(app).toContain("window.addEventListener('pointerdown', noteInteraction");
    expect(dashboard).toContain("staff?.roles.includes('OWNER')");
    expect(dashboard).toContain('目前在線員工');
    expect(dashboard).toContain('getOnlineStaff');
  });
});
