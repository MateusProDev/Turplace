module.exports = (req, res) => {
  res.status(200).json({ ok: true, service: 'turplace-api', timestamp: new Date().toISOString() });
};
