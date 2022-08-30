// const request = require('request');
// const fetch = require('node-fetch');
const fetch = require('wonderful-fetch');
const fs = require('fs');
const jetpack = require('fs-jetpack');
const pathApi = require('path');
const os = require('os');

let template =
`
---
### ALL PAGES ###
layout: {{layout}}

### POST ONLY ###
post:
  title: "{{title}}"
  excerpt: "{{excerpt}}"
  author: {{author}}
  id: {{id}}
  tags: {{tags}}
  categories: {{categories}}
  affiliate-search-term: {{affiliate}}
---
{{body}}
`

let imgTemplate = `{%- include /master/helpers/blog-image.html name="{name}" alt="{alt}" -%}`;


function Post(init) {
  const self = this;

  init = init || {};
  self.environment = init.environment || 'development';
  self.onDownload = function () {
    return new Promise(function(resolve, reject) {
      resolve();
    });
  }
  self.imageMap = [];
}


Post.prototype.create = function (body) {
  const self = this;

  return new Promise(async function(resolve, reject) {
    // body = querystring.parse(body);
    // console.log('-----222 body', body);
    let error;
    let keys = Object.keys(body.payload);
    let images = [];
    let imagesMatrix = [];
    let links = [];
    let linksMatrix = [];
    let content = template;
    let imageSavePath = `./assets/_src/images/blog/posts/post-${body.payload.id}/`;
    let imageSavePathReg = `/assets/images/blog/posts/post-${body.payload.id}/`;
    body.payload.replaceImagesIncludeTag = body.payload.replaceImagesIncludeTag || imgTemplate;
    for (var i = 0; i < keys.length; i++) {
      content = content.replace(`{{${[keys[i]]}}}`, body.payload[keys[i]]);
    }
    images = content.match(/(?:!\[(.*?)\]\((.*?)\))/img) || [];
    links = content.match(/(?:\[(.*?)\]\((.*?)\))/img) || [];

    // Images
    for (var i = 0; i < images.length; i++) {
      let alt = ((images[i].match(/\[(.*?)\]/img) || [])[0]+'').replace(/(\[|\])/img, '');
      let title = ((images[i].match(/\((.*?)\)/img) || [])[0]+'').replace(/(\(|\))/img, '');
      let link = title.replace(/\s.*?"(.*?)"\s*/g,'');
      let different = (title != link);
      // let newLink = (alt.replace(/\s/g, '-') + '.jpg').toLowerCase();
      let newLink = (alt.trim().replace(/\s/g, '-') + '').toLowerCase();
      imagesMatrix.push({
        alt: alt,
        link: link,
        newLink: newLink,
      })

      let curSavePath = `${imageSavePath}${newLink}`;
      await self.download(link, imageSavePath, newLink)
      .then(function (result) {
        // console.log('-----result', result);
        // console.log(`Saved image to: ${curSavePath}.${result.extension}`);
        let tempPrePath = (body.payload.includeLocalImagePath ? imageSavePathReg : '');
        let lookForLink = different ? title : link;
        if (body.payload.enableReplaceImagesMarkdown) {
          let imageFullPath = tempPrePath + newLink + '.' + result.extension;
          content = content.replace(`![${alt}](${lookForLink})`, body.payload.replaceImagesIncludeTag.replace('{url}', imageFullPath).replace('{name}', imageFullPath.split('/').pop()).replace('{alt}', alt))
        } else {
          content = content.replace(`![${alt}](${lookForLink})`, `![${alt}](${tempPrePath + newLink + result.extension})`)
        }
      })
      .catch(function (e) {
        error = e;
      })
    }

    // Download main image
    let headerPath = `${imageSavePath}${body.payload.url}`;
    await self.download(body.payload.headerImageURL, imageSavePath, body.payload.url)
    .then(function (result) {
      // console.log(`Saved header image to: ${headerPath}.${result.extension}`);
    })
    .catch(function (e) {
      error = e;
    })

    if (error) {
      return reject(error);
    }

    // console.log('imagesMatrix', imagesMatrix);
    // console.log('linksMatrix', linksMatrix);
    // console.log('final content', content);

    // Trim and add final line at bottom
    content = `${content.trim()}\n`;

    // Save post
    let postPath = `${body.payload.path}/${body.payload.date}-${body.payload.url}.md`.replace(/\/\//g, '/');
    // console.log('Saving post to....', postPath);
    // jetpack.write(postPath, content)

    // Post handler
    //    dom.select('#replaceImagesIncludeTag').setValue(fields.replaceImagesIncludeTag || '');
    // console.log('-----333 body', body);

    // let postHandlerResponse = await fetch(body.payload.postHandlerEndpoint, {
    // // let postHandlerResponse = await fetch('http://localhost:5001/ultimate-jekyll/us-central1/bm_api', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     backendManagerKey: body.backendManagerKey,
    //     authenticationToken: body.authenticationToken,
    //     command: 'handler:create-post',
    //     payload: body.payload,
    //   }),
    // })
    // .then(function (res) {
    //   return res.text()
    //   .then(function (data) {
    //     if (res.ok) {
    //       return JSON.parse(data)
    //     } else {
    //       throw new Error(data || res.statusText || 'Unknown error.')
    //     }
    //   })
    // })
    // .catch(function (e) {
    //   return e;
    // });

    let postHandlerResponse = await fetch(body.payload.postHandlerEndpoint, {
      method: 'POST',
      response: 'json',
      body: {
        backendManagerKey: body.backendManagerKey,
        authenticationToken: body.authenticationToken,
        command: 'handler:create-post',
        payload: body.payload,
      },
    })
    .then(response => response)
    .catch(e => e);

    const postHandlerError = postHandlerResponse instanceof Error;

    resolve({
      path: postPath,
      content: content,
      postHandler: {
        success: !postHandlerError,
        data: postHandlerError ? `${postHandlerResponse}` : postHandlerResponse,
      },
    });
  });
};


Post.prototype.download = function (uri, filepath, filename, callback) {
  const self = this;
  let meta = {};

  return new Promise(function(resolve, reject) {
    fetch(uri, {
      method: 'get',
      // encoding: 'binary',
    })
    .then(async (res) => {
      // console.log('res', res);
      let type = res.headers.get('content-type');
      let ext = '';
      if (type.includes('image/jpeg') || type.includes('image/jpg')) {
        ext = 'jpg';
      } else if (type.includes('image/png')) {
        ext = 'png';
      } else {
        return reject(`Incorrect image type: ${type}`)
      }

      meta.extension = ext;
      meta.finalPath = `${filepath}${filename}.${ext}`;
      meta.tempPath = getTempPath(`${filepath}${filename}.${ext}`);
      jetpack.dir(pathApi.dirname(meta.tempPath));

      // res.body.pipe(fs.createWriteStream(meta.tempPath, {encoding: 'binary'}));

      const fileStream = jetpack.createWriteStream(meta.tempPath, {encoding: 'binary'});

      res.body.pipe(fileStream);
      res.body.on('error', function (e) {
        return reject(new Error('Failed to download: ' + e));
      });

      fileStream.on('finish', function () {
        // all done
        self.imageMap.push({
          finalPath: meta.finalPath,
          tempPath: meta.tempPath,
        });

        self.onDownload(meta)
        .then(() => {
          return resolve(meta);
        })
        .catch(e => {
          return reject(e);
        })
      });

    })
    .catch(e => {
      return reject(e);
    })
  });
};

function getTempPath(path) {
  let tempPrefix = os.tmpdir();
  return path.indexOf(tempPrefix) == -1 ? pathApi.join(tempPrefix, path) : path;
}

Post.prototype.saveImage = function (path, options) {
  const self = this;
  // console.log('Post.saveImage...');
  return new Promise(function(resolve, reject) {

    try {
      // console.log('self.imageMap', self.imageMap);
      // console.log('looking for...', path);
      let imageObj = self.imageMap.find(function (element) {
        // console.log('testing against...', element.finalPath);
        return element.finalPath == path;
      });
      jetpack.dir(pathApi.dirname(imageObj.finalPath));
      jetpack.move(imageObj.tempPath, imageObj.finalPath, {overwrite: true});
      return resolve();
    } catch (e) {
      return reject(e);
    }

  });
};


Post.prototype.createWriteStream = function (filepath, options) {
  const self = this;

  options = options || {};
  options.temp = typeof options.temp !== 'undefined' ? options.temp : false;
  if (options.temp === true) {
    filepath = pathApi.join(os.tmpdir(), filepath);
  }

  // console.log('Post.createWriteStream', filepath);
  jetpack.dir(pathApi.dirname(filepath));
  return jetpack.createWriteStream(filepath);
};

Post.prototype.read = function (filepath, options) {
  const self = this;

  options = options || {};
  options.temp = typeof options.temp !== 'undefined' ? options.temp : false;
  if (options.temp === true) {
    filepath = pathApi.join(os.tmpdir(), filepath);
  }
  // console.log('Post.read', filepath, 'length = ', jetpack.read(filepath).length);
  return jetpack.read(filepath);
};

Post.prototype.readImage = function (filepath) {
  const self = this;

  return new Promise(function(resolve, reject) {

    fs.readFile(filepath, 'binary', (e, data) => {
      if (e) {
        console.log(e);
        return reject(e);
      } else {
        // let file_content = data.toString('utf8')
        // let image = Buffer.from(data.toString(), 'binary');
        // console.log('read', filepath);
        // console.log('result', image);
        return resolve(Buffer.from(data.toString(), 'binary'));
        // your code here
      }
    })

  });
};


Post.prototype.write = function (filepath, content, options) {
  const self = this;

  options = options || {};
  options.temp = typeof options.temp !== 'undefined' ? options.temp : false;
  if (options.temp === true) {
    filepath = pathApi.join(os.tmpdir(), filepath);
  }

  // console.log('Post.write', filepath);
  jetpack.dir(pathApi.dirname(filepath));
  return jetpack.write(filepath, content);
};

Post.prototype.removeDirDot = function (filepath) {
  const self = this;

  return filepath.replace(/^\.\//, '');
};

Post.prototype.cleanTempFiles = function (filepath) {
  const self = this;

  let array = self.tempFiles;
  for (var i = 0; i < array.length; i++) {
    // console.log('Removing...');
  }
};

module.exports = Post;
