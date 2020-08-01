const request     = require('request');
const fs = require("fs-jetpack");
let pathApi;
let os;

let fsApi;
let template =
`
---
### ALL PAGES ###
layout: {{layout}}

### POST ONLY ###
post:
  title: {{title}}
  excerpt: {{excerpt}}
  author: {{author}}
  id: {{id}}
  tags: {{tags}}
  categories: {{categories}}
  affiliate-search-term: {{affiliate}}
---
{{body}}
`

let imgTemplate = `{%- include /master/helpers/image.html src="{{url}}" alt="{{alt}}" -%}`;


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
      // console.log('-------->replacing',[keys[i]], 'with', body[keys[i]]);
      content = content.replace(`{{${[keys[i]]}}}`, body[keys[i]]);
    }
    images = content.match(/(?:!\[(.*?)\]\((.*?)\))/img) || [];
    links = content.match(/(?:\[(.*?)\]\((.*?)\))/img) || [];

    // Images
    for (var i = 0; i < images.length; i++) {
      let alt = ((images[i].match(/\[(.*?)\]/img)|| [])[0]+'').replace(/(\[|\])/img, '');
      let title = ((images[i].match(/\((.*?)\)/img)|| [])[0]+'').replace(/(\(|\))/img, '');
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
        // console.log(`Saved image to: ${curSavePath}.${result.extension}`);
        let tempPrePath = (body.includeLocalImagePath ? imageSavePathReg : '');
        let lookForLink = different ? title : link;
        if (body.enableReplaceImagesMarkdown) {
          content = content.replace(`![${alt}](${lookForLink})`, body.replaceImagesIncludeTag.replace('{{url}}', tempPrePath + newLink + result.extension).replace('{{alt}}', alt))
        } else {
          content = content.replace(`![${alt}](${lookForLink})`, `![${alt}](${tempPrePath + newLink + result.extension})`)
        }
      })
    }
    // Links
    // for (var i = 0; i < links.length; i++) {
    //   if (content.indexOf('!' + links[i]) == -1) {
    //     let alt = ((links[i].match(/\[(.*?)\]/img)|| [])[0]+'').replace(/(\[|\])/img, '');
    //     let link = ((links[i].match(/\((.*?)\)/img)|| [])[0]+'').replace(/(\(|\))/img, '').replace(/\s.*?"(.*?)"\s*/g,'');
    //     let newLink = false;
    //     let needsReplacing = link.indexOf('url?q=') != -1;
    //     if (needsReplacing) {
    //       newLink = (querystring.parse(link.split('?')[1]).q)
    //     }
    //     linksMatrix.push({
    //       alt: alt,
    //       link: link,
    //       newLink: newLink,
    //     });
    //     if (needsReplacing) {
    //       content = content.replace(`[${alt}](${link})`, `[${alt}](${newLink})`)
    //     }
    //   }
    // }

    // Download main image
    let headerPath = `${imageSavePath}${body.url}`;
    await This.download(body.headerImageURL, imageSavePath, body.url)
    .then(function (result) {
      console.log(`Saved header image to: ${headerPath}.${result.extension}`);
    })

    console.log('imagesMatrix', imagesMatrix);
    console.log('linksMatrix', linksMatrix);
    console.log('final content', content);

    // Trim and add final line at bottom
    content = `${content.trim()}\n`;

    // Save post
    let postPath = `${body.path}/${body.date}-${body.url}.md`.replace(/\/\//g, '/');
    console.log('Saving to....', postPath);
    // fs.write(postPath, content)

    resolve({
      path: postPath,
      content: content,
    });
  });
};

// Post.prototype.download = function (uri, filepath, filename, callback) {
//   let This = this;
//   return new Promise(function(resolve, reject) {
//     let meta = {};
//
//     const req = request
//       .get(uri)
//       .on('response', async function (res) {
//         let meta = {};
//         if (res.statusCode === 200) {
//           let type = res.headers['content-type'];
//           let ext = '';
//           if (type == 'image/jpeg' || type == 'image/jpg') {
//             ext = 'jpeg';
//           } else if ('image/png') {
//             ext = 'png';
//           }
//           meta.extension = ext;
//           This.imageMap.push({
//             finalPath: `${filepath}${filename}.${ext}`,
//             tempPath: `./.temp/${filepath}${filename}.${ext}`,
//           });
//           await This.onDownload(req, filepath, filename, ext);
//           resolve(meta);
//         }
//       })
//
//   });
// };

// Post.prototype.download = function (uri, filepath, filename, callback) {
//   let This = this;
//   return new Promise(function(resolve, reject) {
//     let meta = {};
//
//     // const req = request
//     request(
//       { method: 'GET'
//       , uri: uri
//       , encoding: 'binary'
//       }
//     , async function (error, res, body) {
//         // body is the decompressed response body
//         // console.log('the decoded data is: ' + body)
//         let type = res.headers['content-type'];
//         let ext = '';
//         if (type == 'image/jpeg' || type == 'image/jpg') {
//           ext = 'jpg';
//         } else if ('image/png') {
//           ext = 'png';
//         }
//
//         meta.extension = ext;
//         let finalPath = `${filepath}${filename}.${ext}`;
//         let tempPath = getTempPath(`${filepath}${filename}.${ext}`);
//         This.imageMap.push({
//           finalPath: finalPath,
//           tempPath: tempPath,
//         });
//         pathApi = pathApi || require('path');
//         fsApi = fsApi || require('fs');
//
//         fs.dir(pathApi.dirname(tempPath));
//         // fsApi.writeFile(tempPath, body, 'binary', async function (err) {
//         //   if (err) {
//         //     console.log("ERROR", err);
//         //     reject(err);
//         //   } else {
//         //     console.log('SAVED TO', tempPath);
//         //     await This.onDownload(null, filepath, filename, ext);
//         //     resolve(meta);
//         //   }
//         // });
//         fsApi.writeFile(tempPath, body, '', async function (err) {
//           if (err) {
//             console.log("ERROR", err);
//             reject(err);
//           } else {
//             console.log('SAVED TO', tempPath);
//             await This.onDownload(null, filepath, filename, ext);
//             resolve(meta);
//           }
//         });
//
//
//       }
//     )
//
//   });
// };


Post.prototype.download = function (uri, filepath, filename, callback) {
  let This = this;
  var request = require('request')
  var fs = require('fs')
  var through2 = require('through2')
  let meta = {};

  options = {
     method: 'GET'
    , uri: uri
    , encoding: 'binary'
  };

  return new Promise(function(resolve, reject) {
    var req = request(options)
    req.on('response', function (res) {
        let type = res.headers['content-type'];
        let ext = '';
        if (type == 'image/jpeg' || type == 'image/jpg') {
          ext = 'jpg';
        } else if ('image/png') {
          ext = 'png';
        }
        meta.extensions = ext;
        meta.finalPath = `${filepath}${filename}.${ext}`;
        meta.tempPath = getTempPath(`${filepath}${filename}.${ext}`);
        req.pipe(fs.createWriteStream(meta.tempPath, {encoding: 'binary'}))
        req.on('end', async function () {
          // all done
          This.imageMap.push({
            finalPath: meta.finalPath,
            tempPath: meta.tempPath,
          });
          await This.onDownload(meta);

          console.log('---download DONE, saved to tempPath', meta.tempPath);
          resolve(meta);
        })

    })
    // req.on('response',function(res){
    //     //Some computations to remove files potentially
    //     //These computations take quite somme time.
    //     //Function that creates path recursively
    //     console.log('RECEIVED');
    //     let type = res.headers['content-type'];
    //     let ext = '';
    //     if (type == 'image/jpeg' || type == 'image/jpg') {
    //       ext = 'jpeg';
    //     } else if ('image/png') {
    //       ext = 'png';
    //     }
    //     let finalPath = `${filepath}${filename}.${ext}`;
    //     let tempPath = getTempPath(`${filepath}${filename}.${ext}`);
    //     req.pipe(fs.createWriteStream(tempPath)).on('end', function() {
    //       console.log('PIPEFINISHED');
    //     })
    //         //
    //         // var file = fs.createWriteStream(tempPath)
    //         // var stream = through2.obj(function (chunk, enc, callback) {
    //         //     this.push(chunk)
    //         //     callback()
    //         // })
    //         // stream.on('data',function(data){
    //         //   console.log('DATA RECEIVED');
    //         //     file.write(data);
    //         // })
    //         //
    //         // stream.on('end',function(){
    //         //     file.end()
    //         //     console.log('END');
    //         //     resolve();
    //         // })
    // })
  });
};

function getTempPath(path) {
  pathApi = pathApi || require('path');
  os = os || require('os');
  let tempPrefix = os.tmpdir();
  return path.indexOf(tempPrefix) == -1 ? pathApi.join(tempPrefix, path) : path;
}

Post.prototype.saveImage = function (path, options) {
  let This = this;
  return new Promise(function(resolve, reject) {
    fsApi = fsApi || require('fs');
    pathApi = pathApi || require('path');

    console.log('This.imageMap', This.imageMap);
    console.log('looking for...', path);
    let imageObj = This.imageMap.find(function (element) {
      console.log('testing against...', element.finalPath);
      return element.finalPath == path;
    });

    fs.move(imageObj.tempPath, imageObj.finalPath, {overwrite: true});
    // options = options || {};
    // options.temp = typeof options.temp !== 'undefined' ? options.temp : false;
    // if (options.temp === true) {
    //   const os = require('os');
    //   path = pathApi.join(os.tmpdir(), path);
    // }
    // let content = fs.read(path);
    resolve();

    // fs.dir(pathApi.dirname(path));
    // fsApi.writeFile(path, content, 'binary', function (err) {
    //   if (err) {
    //     console.log("ERROR", err);
    //     reject(err);
    //   } else {
    //     resolve();
    //     console.log('SAVED TO', path);
    //   }
    // });
  });
};


Post.prototype.createWriteStream = function (filepath, options) {
  const path = require('path');

  options = options || {};
  options.temp = typeof options.temp !== 'undefined' ? options.temp : false;
  if (options.temp === true) {
    const os = require('os');
    filepath = path.join(os.tmpdir(), filepath);
  }

  console.log('Post.createWriteStream', filepath);
  fs.dir(path.dirname(filepath));
  return fs.createWriteStream(filepath);
};

Post.prototype.read = function (filepath, options) {
  const path = require('path');

  options = options || {};
  options.temp = typeof options.temp !== 'undefined' ? options.temp : false;
  if (options.temp === true) {
    const os = require('os');
    filepath = path.join(os.tmpdir(), filepath);
  }
  console.log('Post.read', filepath, 'length = ', fs.read(filepath).length);
  return fs.read(filepath);
};

Post.prototype.readImage = function (filepath) {
  const path = require('path');
  fsApi = fsApi || require('fs');

  return new Promise(function(resolve, reject) {

    // let prs = path.parse(filepath);
    // let image;
    // if (prs.ext == '.jpg') {
    //   image = Buffer.from(fsApi.readFileSync(filepath, 'binary').toString(), 'binary');
    // } else if (prs.ext == '.png') {
    //   // image = fsApi.readFileSync('.'+filepath, 'binary');
    //   // image = fsApi.readFileSync(filepath, 'binary');
    //   image = Buffer.from(fsApi.readFileSync(filepath, 'binary').toString(), 'binary');
    //   // image = fs.read(filepath)
    // }
    fsApi.readFile(filepath, 'binary', (err, data)=>{
        if(err){
            console.log(err)
            throw err
        }else{
            // let file_content = data.toString('utf8')
            let image = Buffer.from(data.toString(), 'binary');
            console.log('read', filepath);
            console.log('result', image);
            resolve(image);

            // your code here
        }
    })

    // setTimeout(function () {
    //   console.log(fs.read(filepath));
    // }, 5000);
    // return fs.read(filepath);
    // let img = fsApi.readFileSync(filepath, 'binary');
    // let try1 = img.substring(0,50);
    // // let img2 = fsApi.readFileSync(filepath);
    // let img2 = fsApi.readFileSync(filepath);
    // let img2_uft = Buffer.from(img2).toString('utf8');
    // let try2 = img2.substring(0,50);
    // console.log('---1', try1);
    // console.log('---2', img2_uft);
    // console.log('SUPPOSED:', ``);
    // var image = new Buffer(bl.toString(), 'binary').toString('base64');
    // let prs = path.parse(filepath);
    // let newpath = (prs.dir + '/TEST-' + prs.base);
    // console.log('NEWPAHT',newpath);
    // fs.write(newpath, img2_uft)
    // return new Buffer(fsApi.readFileSync(filepath, 'binary').toString(), 'binary').toString('base64');
    // console.log('Post.read', filepath, 'sample = ', 'length = ', image.length);
    // return image
  });
  // return fsApi.readFileSync(filepath, 'binary');
};


Post.prototype.write = function (filepath, content, options) {
  const path = require('path');

  options = options || {};
  options.temp = typeof options.temp !== 'undefined' ? options.temp : false;
  if (options.temp === true) {
    const os = require('os');
    filepath = path.join(os.tmpdir(), filepath);
  }

  console.log('Post.write', filepath);
  fs.dir(path.dirname(filepath));
  return fs.write(filepath, content);
};

Post.prototype.removeDirDot = function (filepath) {
  return filepath.replace(/^\.\//, '');
};

Post.prototype.cleanTempFiles = function (filepath) {
  let array = This.tempFiles;
  for (var i = 0; i < array.length; i++) {
    console.log('Removing...');
  }
};

module.exports = Post;



// request.head(uri, function(err, res, body) {
//   meta['content-type'] = res.headers['content-type'];
//   meta['content-length'] = res.headers['content-length'];
//   meta.extension = '';
//
//   if (meta['content-type'].indexOf('png') != -1) {
//     meta.extension = '.png'
//   } else if (meta['content-type'].indexOf('jpg') != -1) {
//     meta.extension = '.jpg'
//   } else if (meta['content-type'].indexOf('jpeg') != -1) {
//     // meta.extension = '.jpeg'
//     meta.extension = '.jpg'
//   }
//
//
//   let dir = filename.split('/');
//   dir.pop();
//   dir = dir.join('/');
//   fs.dir(dir);
//
//   function test(one,two,three) {
//     console.log('STREAM', one,two,three);
//   }
//   this.on('data', function(data) {
//     // decompressed data as it is received
//     console.log('decoded chunk: ' + data)
//   })
//
//   // request(uri).pipe(test).on('close', function () {
//   //   // callback(meta);
//   //   resolve(meta);
//   // });
// });




// let image1 = '';
// let image2 = '';
//
// let dl =
// request(
//   { method: 'GET'
//   // , uri: uri
//   , uri: 'https://images.unsplash.com/photo-1576974016648-33000f8f7c58?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1950&q=80'
//   // , gzip: true
//   , encoding: null
//   }
// , function (error, response, body) {
//     // body is the decompressed response body
//     console.log('server encoded the data as: ' + (response.headers['content-encoding'] || 'identity'))
//     console.log('The content type is', response.headers['content-type']);
//     // console.log('the decoded data is: ' + body);
//     console.log('the data length is: ' + body.length);
//     console.log('saving to', filename);
//   }
// )
// .on('data', function(data) {
//   // decompressed data as it is received
//   // console.log('decoded chunk: ' + data);
//   image1 += data;
//   dl.pipe(fs.createWriteStream(filename + '-3.jpg'))
// })
// .on('response', function(response) {
//   // unmodified http.IncomingMessage object
//   response.on('data', function(data) {
//     // compressed data as it is received
//     console.log('received ' + data.length + ' bytes of compressed data')
//     image2 += data;
//
//   })
// })
// .on('close', function (something) {
//   console.log('DONE!');
//   fs.write(filename+'-1.jpg', image1);
//   fs.write(filename+'-2.jpg', image2);
// })

// Post.prototype.download = function (uri, filename, callback) {
//   return new Promise(function(resolve, reject) {
//     let meta = {};
//     request.head(uri, function(err, res, body){
//       meta['content-type'] = res.headers['content-type'];
//       meta['content-length'] = res.headers['content-length'];
//       meta.extension = '';
//       if (meta['content-type'].indexOf('png') != -1) {
//         meta.extension = '.png'
//       } else if (meta['content-type'].indexOf('jpg') != -1) {
//         meta.extension = '.jpg'
//       } else if (meta['content-type'].indexOf('jpeg') != -1) {
//         // meta.extension = '.jpeg'
//         meta.extension = '.jpg'
//       }
//
//       let dir = filename.split('/');
//       dir.pop();
//       dir = dir.join('/');
//       fs.dir(dir);
//       request(uri).pipe(fs.createWriteStream(filename + meta.extension)).on('close', function () {
//         // callback(meta);
//         resolve(meta);
//       });
//     });
//   });;
// };
