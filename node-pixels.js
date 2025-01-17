"use strict";

var ndarray = require("ndarray");
var PNG = require("pngjs").PNG;
var jpeg = require("jpeg-js");
// var fs            = require('fs')
// var request = require("request");
var mime = require("mime-types");
var parseDataURI = require("parse-data-uri");
var nodeFetch = require("cross-fetch");
var toBuffer = require("blob-to-buffer");

function handlePNG(data, cb) {
  var png = new PNG();
  png.parse(data, function (err, img_data) {
    if (err) {
      cb(err);
      return;
    }
    cb(
      null,
      ndarray(
        new Uint8Array(img_data.data),
        [img_data.width | 0, img_data.height | 0, 4],
        [4, (4 * img_data.width) | 0, 1],
        0
      )
    );
  });
}

function handleJPEG(data, cb) {
  var jpegData;
  try {
    jpegData = jpeg.decode(data);
  } catch (e) {
    cb(e);
    return;
  }
  if (!jpegData) {
    cb(new Error("Error decoding jpeg"));
    return;
  }
  var nshape = [jpegData.height, jpegData.width, 4];
  var result = ndarray(jpegData.data, nshape);
  cb(null, result.transpose(1, 0));
}

function doParse(mimeType, data, cb) {
  switch (mimeType) {
    case "image/png":
      handlePNG(data, cb);
      break;

    case "image/jpg":
    case "image/jpeg":
      handleJPEG(data, cb);
      break;

    default:
      cb(new Error("Unsupported file type: " + mimeType));
  }
}

module.exports = async function getPixels(url, type, cb) {
  if (!cb) {
    cb = type;
    type = "";
  }
  if (Buffer.isBuffer(url)) {
    if (!type) {
      cb(new Error("Invalid file type"));
      return;
    }
    doParse(type, url, cb);
  } else if (url.indexOf("data:") === 0) {
    try {
      var buffer = parseDataURI(url);
      if (buffer) {
        process.nextTick(function () {
          doParse(type || buffer.mimeType, buffer.data, cb);
        });
      } else {
        process.nextTick(function () {
          cb(new Error("Error parsing data URI"));
        });
      }
    } catch (err) {
      process.nextTick(function () {
        cb(err);
      });
    }
  } else if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0) {
    type = type;

    try {
      const response = await nodeFetch(url);
      console.log("get-pixels response", response);
      const blob = await response.blob();
      console.log("get-pixels blob", blob);

      // var resultBlob = new Blob([ new Uint8Array([1, 2, 3]) ], { type: 'application/octet-binary' })

      toBuffer(blob, function (err, buffer) {
        if (err) throw err;
        console.log("parse buffer from blob ", buffer);
        // buffer[0] // => 1
        // buffer.readUInt8(1) // => 2
      });

      // const typeOfRes = await fileType.fromBuffer(buffer)
      // console.log('get-pixelstypeOfRes ', typeOfRes)

      // if(type, buffer, cb) {
      //   doParse(type, buffer, cb);
      // }
    } catch (err) {
      console.log("get-pixels  err", err);
    }

    // nodeFetch(url)
    //   .then((response) => {
    //     if (!type) {
    //       if (response.headers.get !== undefined) {
    //         type = response.headers.get("content-type");
    //       }
    //       return response.buffer();
    //     }
    //   })
    //   .then((buffer) => {
    //     console.log("bello fetch body", b);
    //     if (!type) {
    //       cb(new Error("Invalid content-type"));
    //       return;
    //     }

    //     doParse(type, buffer, cb);
    //   })
    //   .catch((err) => {
    //     console.log("err", err);
    //     cb(err);
    //     return;
    //   });

    // request({ url: url, encoding: null }, function (err, response, body) {
    //   if (err) {
    //     cb(err);
    //     return;
    //   }

    //   type = type;
    //   if (!type) {
    //     if (response.getHeader !== undefined) {
    //       type = response.getHeader("content-type");
    //     } else if (response.headers !== undefined) {
    //       type = response.headers["content-type"];
    //     }
    //   }
    //   if (!type) {
    //     cb(new Error("Invalid content-type"));
    //     return;
    //   }
    //   doParse(type, body, cb);
    // });
  }
  //  else {
  //   fs.readFile(url, function(err, data) {
  //     if(err) {
  //       cb(err)
  //       return
  //     }
  //     type = type || mime.lookup(url)
  //     if(!type) {
  //       cb(new Error('Invalid file type'))
  //       return
  //     }
  //     doParse(type, data, cb)
  //   })
  // }
};
