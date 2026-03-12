const { app } = require('./index');

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Local Express server listening on http://0.0.0.0:${port}`);
});
