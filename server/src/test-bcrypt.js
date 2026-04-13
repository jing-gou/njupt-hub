import bcrypt from 'bcryptjs';
async function test() {
  const hash = await bcrypt.hash('test', 10);
  console.log('Hash:', hash);
}
test();
