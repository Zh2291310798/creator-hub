module.exports = {
  testDir: './tests',
  testMatch: /smoke\.spec\.js$/,
  use: {
    browserName: 'chromium',
    channel: 'chrome',
    headless: true
  }
};
