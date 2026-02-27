const webpack = require('webpack');
const prodConfig = require('../webpack/webpack.prod');
const compiler = webpack(prodConfig);

function send(data) {
  if (!process.send) {
    return;
  }
  return new Promise((r) => {
    process.send(data, null, {}, r);
  });
}

compiler.run(async (err, stats) => {
  if (err) {
    console.error(err);
    await send({
      type: 'Error',
      error: err.message,
    });
    process.exitCode = 1;
    return;
  }

  if (stats && stats.hasErrors()) {
    const errors = stats.toJson({ all: false, errors: true }).errors || [];
    const errorMessage = errors.map((item) => item.message || String(item)).join('\n');
    console.error(stats.toString({ colors: true }));
    await send({
      type: 'Error',
      error: errorMessage || 'Webpack build failed.',
    });
    process.exitCode = 1;
    return;
  }

  await send({
    type: 'Success',
  });
});
