const express = require('express');
const path = require('path');
const { addRecord, getStats } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.use(express.json());

// 静态文件：serve 项目根目录（即 server 的上一级）
app.use(express.static(path.join(__dirname, '..')));

// POST /api/record — 上报游戏记录
app.post('/api/record', (req, res) => {
  const { playerName, characterId, endingId } = req.body;
  if (!playerName || !characterId || !endingId) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  try {
    addRecord(playerName, characterId, endingId);
    res.json({ ok: true });
  } catch (err) {
    console.error('记录保存失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/stats — 获取统计（需密码）
app.get('/api/stats', (req, res) => {
  const password = req.query.password || req.headers['x-admin-password'];
  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: '密码错误' });
  }
  try {
    res.json(getStats());
  } catch (err) {
    console.error('统计查询失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /admin — 后台页面
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`三国武将录服务已启动: http://localhost:${PORT}`);
  console.log(`后台统计: http://localhost:${PORT}/admin`);
});
