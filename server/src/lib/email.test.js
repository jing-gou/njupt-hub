import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResourceReviewResultEmail, buildUploadThankYouEmail } from './email.js';

test('buildUploadThankYouEmail includes upload details and escapes user content', () => {
  const message = buildUploadThankYouEmail({
    username: '<script>alert(1)</script>',
    resources: [
      { title: '期末试卷 <答案>', course: '高等数学' },
      { title: '复习提纲', course: '大学物理' },
    ],
  });

  assert.equal(message.subject, 'NJUPT Hub - 感谢你贡献了 2 份资料');
  assert.match(message.text, /期末试卷 <答案>（高等数学）/);
  assert.match(message.text, /资料已进入审核队列/);
  assert.match(message.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(message.html, /期末试卷 &lt;答案&gt;/);
  assert.doesNotMatch(message.html, /<script>/);
});

test('buildResourceReviewResultEmail renders approved result and escapes resource content', () => {
  const message = buildResourceReviewResultEmail({
    username: 'alice',
    resource: {
      title: '离散数学 <重点>',
      course: '离散数学',
      status: 'APPROVED',
    },
  });

  assert.equal(message.subject, 'NJUPT Hub - 你上传的资料已通过审核');
  assert.match(message.text, /审核结果为：已通过审核/);
  assert.match(message.html, /资料审核通过啦/);
  assert.match(message.html, /离散数学 &lt;重点&gt;/);
});

test('buildResourceReviewResultEmail renders rejected result', () => {
  const message = buildResourceReviewResultEmail({
    username: 'bob',
    resource: {
      title: '实验报告',
      course: '通信原理',
      status: 'REJECTED',
    },
  });

  assert.equal(message.subject, 'NJUPT Hub - 你上传的资料未通过审核');
  assert.match(message.text, /未通过审核/);
  assert.match(message.html, /当前不会展示在资料库中/);
});
