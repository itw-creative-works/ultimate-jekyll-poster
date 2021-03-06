const request = require('request');
const fetch = require('node-fetch');
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
  init = init || {};
  this.environment = init.environment || 'development';
  this.onDownload = function () {

  }
  this.imageMap = [];
}


Post.prototype.create = function (body) {
  let This = this;
  return new Promise(async function(resolve, reject) {
    // body = querystring.parse(body);
    let keys = Object.keys(body);
    let images = [];
    let imagesMatrix = [];
    let links = [];
    let linksMatrix = [];
    let content = template;
    let imageSavePath = `./assets/_src/images/blog/posts/post-${body.id}/`;
    let imageSavePathReg = `/assets/images/blog/posts/post-${body.id}/`;
    body.replaceImagesIncludeTag = body.replaceImagesIncludeTag || imgTemplate;
    for (var i = 0; i < keys.length; i++) {
      content = content.replace(`{{${[keys[i]]}}}`, body[keys[i]]);
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
      await This.download(link, imageSavePath, newLink,)
      .then(function (result) {
        // console.log('-----result', result);
        // console.log(`Saved image to: ${curSavePath}.${result.extension}`);
        let tempPrePath = (body.includeLocalImagePath ? imageSavePathReg : '');
        let lookForLink = different ? title : link;
        if (body.enableReplaceImagesMarkdown) {
          let imageFullPath = tempPrePath + newLink + '.' + result.extension;
          content = content.replace(`![${alt}](${lookForLink})`, body.replaceImagesIncludeTag.replace('{url}', imageFullPath).replace('{name}', imageFullPath.split('/').pop()).replace('{alt}', alt))
        } else {
          content = content.replace(`![${alt}](${lookForLink})`, `![${alt}](${tempPrePath + newLink + result.extension})`)
        }
      })
      .catch(function (e) {
        reject(e);
      })
    }

    // Download main image
    let headerPath = `${imageSavePath}${body.url}`;
    await This.download(body.headerImageURL, imageSavePath, body.url)
    .then(function (result) {
      // console.log(`Saved header image to: ${headerPath}.${result.extension}`);
    })
    .catch(function (e) {
      reject(e);
    })

    // console.log('imagesMatrix', imagesMatrix);
    // console.log('linksMatrix', linksMatrix);
    // console.log('final content', content);

    // Trim and add final line at bottom
    content = `${content.trim()}\n`;

    // Save post
    let postPath = `${body.path}/${body.date}-${body.url}.md`.replace(/\/\//g, '/');
    // console.log('Saving post to....', postPath);
    // jetpack.write(postPath, content)

    resolve({
      path: postPath,
      content: content,
    });
  });
};


Post.prototype.download = function (uri, filepath, filename, callback) {
  let This = this;
  let meta = {};

  options = {
     method: 'GET'
    , uri: uri
    , encoding: 'binary'
  };

  return new Promise(function(resolve, reject) {
    try {
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
        res.body.pipe(fs.createWriteStream(meta.tempPath, {encoding: 'binary'}));

        // all done
        This.imageMap.push({
          finalPath: meta.finalPath,
          tempPath: meta.tempPath,
        });

        await This.onDownload(meta);

        return resolve(meta);
      })

    } catch (e) {
      return reject(e);
    }
  });
};

// Post.prototype.download = function (uri, filepath, filename, callback) {
//   let This = this;
//   let meta = {};
//
//   options = {
//      method: 'GET'
//     , uri: uri
//     , encoding: 'binary'
//   };
//
//   return new Promise(function(resolve, reject) {
//     try {
//       var req = request(options)
//       req.on('response', function (res) {
//           let type = res.headers['content-type'];
//           let ext = '';
//           // console.log('type', type, uri);
//           // console.log('--------1', 'content-type', type);
//           if (type.includes('image/jpeg') || type.includes('image/jpg')) {
//             ext = 'jpg';
//             // console.log('--------1 1');
//           } else if (type.includes('image/png')) {
//             ext = 'png';
//             // console.log('--------1 2');
//           } else {
//             // console.log('--------1 3');
//             return reject(`Incorrect image type: ${type}`)
//           }
//
//           meta.extension = ext;
//           meta.finalPath = `${filepath}${filename}.${ext}`;
//           meta.tempPath = getTempPath(`${filepath}${filename}.${ext}`);
//           jetpack.dir(pathApi.dirname(meta.tempPath));
//           req.pipe(fs.createWriteStream(meta.tempPath, {encoding: 'binary'}))
//           req.on('end', async function () {
//             // all done
//             This.imageMap.push({
//               finalPath: meta.finalPath,
//               tempPath: meta.tempPath,
//             });
//             await This.onDownload(meta);
//
//             // console.log('---download DONE, saved to tempPath', meta.tempPath);
//             return resolve(meta);
//           })
//
//       })
//     } catch (e) {
//       return reject(e);
//     }
//   });
// };

function getTempPath(path) {
  let tempPrefix = os.tmpdir();
  return path.indexOf(tempPrefix) == -1 ? pathApi.join(tempPrefix, path) : path;
}

Post.prototype.saveImage = function (path, options) {
  let This = this;
  // console.log('Post.saveImage...');
  return new Promise(function(resolve, reject) {

    // console.log('This.imageMap', This.imageMap);
    // console.log('looking for...', path);
    let imageObj = This.imageMap.find(function (element) {
      // console.log('testing against...', element.finalPath);
      return element.finalPath == path;
    });
    jetpack.dir(pathApi.dirname(imageObj.finalPath));
    jetpack.move(imageObj.tempPath, imageObj.finalPath, {overwrite: true});

    resolve();
  });
};


Post.prototype.createWriteStream = function (filepath, options) {
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
  options = options || {};
  options.temp = typeof options.temp !== 'undefined' ? options.temp : false;
  if (options.temp === true) {
    filepath = pathApi.join(os.tmpdir(), filepath);
  }
  // console.log('Post.read', filepath, 'length = ', jetpack.read(filepath).length);
  return jetpack.read(filepath);
};

Post.prototype.readImage = function (filepath) {
  return new Promise(function(resolve, reject) {

    fs.readFile(filepath, 'binary', (err, data)=>{
      if (err) {
          console.log(err)
          throw err
      } else {
          // let file_content = data.toString('utf8')
          let image = Buffer.from(data.toString(), 'binary');
          // console.log('read', filepath);
          // console.log('result', image);
          resolve(image);
          // your code here
      }
    })

  });
};


Post.prototype.write = function (filepath, content, options) {
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
  return filepath.replace(/^\.\//, '');
};

Post.prototype.cleanTempFiles = function (filepath) {
  let array = This.tempFiles;
  for (var i = 0; i < array.length; i++) {
    // console.log('Removing...');
  }
};

module.exports = Post;
