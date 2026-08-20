module.exports = {
  '*.ts': [
    'eslint --max-warnings=0 --fix',
    'prettier --write',
  ],
  '*.{json,md,yaml,yml}': [
    'prettier --write',
  ],
};