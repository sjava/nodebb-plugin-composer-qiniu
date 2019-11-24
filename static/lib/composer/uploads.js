"use strict";

/* globals define, utils, config, app */

define("composer/uploads", [
  "composer/preview",
  "composer/categoryList",
  "translator",
  "settings"
], function(preview, categoryList, translator, Settings) {
  var uploads = {
    inProgress: {}
  };

  var uploadingText = "";

  uploads.initialize = function(post_uuid) {
    initializeDragAndDrop(post_uuid);
    initializePaste(post_uuid);

    addChangeHandlers(post_uuid);
    addTopicThumbHandlers(post_uuid);
    translator.translate("[[modules:composer.uploading, " + 0 + "%]]", function(
      translated
    ) {
      uploadingText = translated;
    });
  };

  function addChangeHandlers(post_uuid) {
    var postContainer = $('.composer[data-uuid="' + post_uuid + '"]');

    postContainer.find("#files").on("change", function(e) {
      var files =
        (e.target || {}).files ||
        ($(this).val()
          ? [{ name: $(this).val(), type: utils.fileMimeType($(this).val()) }]
          : null);
      if (files) {
        uploadContentFiles({
          files: files,
          post_uuid: post_uuid,
          route: config["composer-qiniu"].qiniuUploadURL
        });
      }
    });

    postContainer.find("#topic-thumb-file").on("change", function(e) {
      var files =
          (e.target || {}).files ||
          ($(this).val()
            ? [{ name: $(this).val(), type: utils.fileMimeType($(this).val()) }]
            : null),
        fd;

      if (files) {
        if (window.FormData) {
          fd = new FormData();
          for (var i = 0; i < files.length; ++i) {
            fd.append("files[]", files[i], files[i].name);
          }
        }
        uploadTopicThumb({
          files: files,
          post_uuid: post_uuid,
          route: "/api/topic/thumb/upload",
          formData: fd
        });
      }
    });
  }

  function addTopicThumbHandlers(post_uuid) {
    var postContainer = $('.composer[data-uuid="' + post_uuid + '"]');

    postContainer.on("click", ".topic-thumb-clear-btn", function(e) {
      postContainer
        .find("input#topic-thumb-url")
        .val("")
        .trigger("change");
      resetInputFile(postContainer.find("input#topic-thumb-file"));
      $(this).addClass("hide");
      e.preventDefault();
    });

    postContainer.on(
      "paste change keypress",
      "input#topic-thumb-url",
      function() {
        var urlEl = $(this);
        setTimeout(function() {
          var url = urlEl.val();
          if (url) {
            postContainer.find(".topic-thumb-clear-btn").removeClass("hide");
          } else {
            resetInputFile(postContainer.find("input#topic-thumb-file"));
            postContainer.find(".topic-thumb-clear-btn").addClass("hide");
          }
          postContainer.find("img.topic-thumb-preview").attr("src", url);
        }, 100);
      }
    );
  }

  uploads.toggleThumbEls = function(postContainer, url) {
    var thumbToggleBtnEl = postContainer.find(".topic-thumb-toggle-btn");

    postContainer.find("input#topic-thumb-url").val(url);
    postContainer.find("img.topic-thumb-preview").attr("src", url);
    if (url) {
      postContainer.find(".topic-thumb-clear-btn").removeClass("hide");
    }
    thumbToggleBtnEl.removeClass("hide");
    thumbToggleBtnEl.off("click").on("click", function() {
      var container = postContainer.find(".topic-thumb-container");
      container.toggleClass("hide", !container.hasClass("hide"));
    });
  };

  function resetInputFile($el) {
    $el
      .wrap("<form />")
      .closest("form")
      .get(0)
      .reset();
    $el.unwrap();
  }

  function initializeDragAndDrop(post_uuid) {
    function onDragEnter() {
      if (draggingDocument) {
        return;
      }

      drop.css("top", "0px");
      drop.css("height", postContainer.height() + "px");
      drop.css("line-height", postContainer.height() + "px");
      drop.show();

      drop.on("dragleave", function() {
        drop.hide();
        drop.off("dragleave");
      });
    }

    function onDragDrop(e) {
      e.preventDefault();
      var files = e.originalEvent.dataTransfer.files;
      var fd;

      if (files.length) {
        if (window.FormData) {
          fd = new FormData();
          for (var i = 0; i < files.length; ++i) {
            fd.append("files[]", files[i], files[i].name);
          }
        }

        uploadContentFiles({
          files: files,
          post_uuid: post_uuid,
          route: config["composer-qiniu"].qiniuUploadURL,
          formData: fd
        });
      }

      drop.hide();
      return false;
    }

    function cancel(e) {
      e.preventDefault();
      return false;
    }

    var draggingDocument = false;

    var postContainer = $('.composer[data-uuid="' + post_uuid + '"]');
    var drop = postContainer.find(".imagedrop");

    $(document)
      .off("dragstart")
      .on("dragstart", function() {
        draggingDocument = true;
      })
      .off("dragend")
      .on("dragend", function() {
        draggingDocument = false;
      });

    postContainer.on("dragenter", onDragEnter);

    drop.on("dragover", cancel);
    drop.on("dragenter", cancel);
    drop.on("drop", onDragDrop);
  }

  function initializePaste(post_uuid) {
    var postContainer = $('.composer[data-uuid="' + post_uuid + '"]');
    postContainer.on("paste", function(event) {
      var items = (
        event.clipboardData ||
        event.originalEvent.clipboardData ||
        {}
      ).items;

      [].some.call(items, function(item) {
        var blob = item.getAsFile();

        if (!blob) {
          return false;
        }

        var blobName = utils.generateUUID() + "-" + blob.name;

        var fd = null;
        if (window.FormData) {
          fd = new FormData();
          fd.append("files[]", blob, blobName);
        }

        uploadContentFiles({
          files: [blob],
          fileNames: [blobName],
          post_uuid: post_uuid,
          route: config["composer-qiniu"].qiniuUploadURL,
          formData: fd
        });

        return true;
      });
    });
  }

  function escapeRegExp(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  }

  function insertText(str, index, insert) {
    return str.slice(0, index) + insert + str.slice(index);
  }

  function uploadContentFiles(params) {
    var files = params.files;
    var post_uuid = params.post_uuid;
    var postContainer = $('.composer[data-uuid="' + post_uuid + '"]');
    var textarea = postContainer.find("textarea");
    var text = textarea.val();
    var uploadForm = postContainer.find("#fileForm");
    var doneUploading = false;
    uploadForm.attr("action", config.relative_path + params.route);

    var cid = categoryList.getSelectedCid();
    if (!cid && ajaxify.data.cid) {
      cid = ajaxify.data.cid;
    }

    for (var i = 0; i < files.length; ++i) {
      var isImage = files[i].type.match(/image./);
      if (
        (isImage && !app.user.privileges["upload:post:image"]) ||
        (!isImage && !app.user.privileges["upload:post:file"])
      ) {
        return app.alertError("[[error:no-privileges]]");
      }
    }

    var filenameMapping = [];

    for (var i = 0; i < files.length; ++i) {
      // The filename map has datetime and iterator prepended so that they can be properly tracked even if the
      // filenames are identical.
      filenameMapping.push(
        i +
          "_" +
          Date.now() +
          "_" +
          (params.fileNames ? params.fileNames[i] : files[i].name)
      );
      var isImage = files[i].type.match(/image./);

      if (files[i].size > parseInt(config.maximumFileSize, 10) * 1024) {
        uploadForm[0].reset();
        return app.alertError(
          "[[error:file-too-big, " + config.maximumFileSize + "]]"
        );
      }

      text = insertText(
        text,
        textarea.getCursorPosition(),
        (isImage ? "!" : "") +
          "[" +
          filenameMapping[i] +
          "](" +
          uploadingText +
          ") "
      );
    }
    if (uploadForm.length) {
      postContainer.find('[data-action="post"]').prop("disabled", true);
    }
    textarea.val(text);

    $(window).trigger("action:composer.uploadStart", {
      post_uuid: post_uuid,
      files: filenameMapping.map(function(filename, i) {
        return {
          filename: filename.replace(/^\d+_\d{13}_/, ""),
          isImage: /image./.test(files[i].type)
        };
      }),
      text: uploadingText
    });

    uploadForm.off("submit").submit(function() {
      function updateTextArea(filename, text, trim) {
        var newFilename;
        if (trim) {
          newFilename = filename.replace(/^\d+_\d{13}_/, "");
        }
        var current = textarea.val();
        var re = new RegExp(escapeRegExp(filename) + "]\\([^)]+\\)", "g");
        textarea.val(
          current.replace(re, (newFilename || filename) + "](" + text + ")")
        );

        $(window).trigger("action:composer.uploadUpdate", {
          post_uuid: post_uuid,
          filename: filename,
          text: text
        });
      }

      uploads.inProgress[post_uuid] = uploads.inProgress[post_uuid] || [];

      for (var i = 0; i < files.length; ++i) {
        uploads.inProgress[post_uuid].push(1);
        var fd = new FormData();
        fd.append("file", files[i]);

        var key = [createUUID()]
          .concat(files[i].name.split(".").slice(-1))
          .join(".");
        fd.append("key", key);

        fd.append("x:filename", filenameMapping[i]);

        $(this).ajaxSubmit({
          headers: {
            "x-csrf-token": config.csrf_token
          },
          formData: fd,
          data: { cid: cid },
          // async: false,

          beforeSubmit: function(arr, $form, options) {
            $.ajax({
              url: "/api/qiniu/token",
              data: { key: key },
              success: function(result) {
                options.formData.append("token", result.token);
              },
              error: function() {
                app.alertError("获取凭证出错");
              },
              async: false
            });
          },

          error: function(xhr) {
            postContainer.find('[data-action="post"]').prop("disabled", false);
            onUploadError(xhr);
          },

          uploadProgress: function(event, position, total, percent) {
            translator.translate(
              "[[modules:composer.uploading, " + percent + "%]]",
              function(translated) {
                if (doneUploading) {
                  return;
                }
                for (var i = 0; i < files.length; ++i) {
                  updateTextArea(filenameMapping[i], translated);
                }
              }
            );
          },

          success: function(uploads) {
            doneUploading = true;
            // if (uploads && uploads.key) {
            // 	updateTextArea(uploads["x:filename"] || filenameMapping[i], config['composer-qiniu'].qiniuCDNDomain + '/' +uploads.key, true);
            // }
            if (uploads && uploads.key) {
              var waterStyle = config["composer-qiniu"].qiniuWaterStyle;
              if (waterStyle) {
                updateTextArea(
                  uploads["x:filename"] || filenameMapping[i],
                  config["composer-qiniu"].qiniuCDNDomain +
                    "/" +
                    uploads.key +
                    "-" +
                    waterStyle,
                  true
                );
              } else {
                updateTextArea(
                  uploads["x:filename"] || filenameMapping[i],
                  config["composer-qiniu"].qiniuCDNDomain + "/" + uploads.key,
                  true
                );
              }
            }

            preview.render(postContainer);
            textarea.focus();
            postContainer.find('[data-action="post"]').prop("disabled", false);
          },

          complete: function() {
            uploads.inProgress[post_uuid].pop();
            if (uploads.inProgress[post_uuid].length == 0) {
              uploadForm[0].reset();
              $(this).resetForm();
              $(this).clearForm();
            }
          }
        });
      }

      return false;
    });

    uploadForm.submit();
  }

  function uploadTopicThumb(params) {
    var post_uuid = params.post_uuid,
      postContainer = $('.composer[data-uuid="' + post_uuid + '"]'),
      spinner = postContainer.find(".topic-thumb-spinner"),
      thumbForm = postContainer.find("#thumbForm");

    thumbForm.attr("action", config.relative_path + params.route);

    thumbForm.off("submit").submit(function() {
      spinner.removeClass("hide");

      uploads.inProgress[post_uuid] = uploads.inProgress[post_uuid] || [];
      uploads.inProgress[post_uuid].push(1);

      $(this).ajaxSubmit({
        headers: {
          "x-csrf-token": config.csrf_token
        },
        formData: params.formData,
        error: onUploadError,
        success: function(uploads) {
          postContainer
            .find("#topic-thumb-url")
            .val((uploads[0] || {}).url || "")
            .trigger("change");
        },
        complete: function() {
          uploads.inProgress[post_uuid].pop();
          spinner.addClass("hide");
        }
      });
      return false;
    });
    thumbForm.submit();
  }

  function onUploadError(xhr) {
    var msg =
      (xhr.responseJSON && xhr.responseJSON.error) || "[[error:parse-error]]";
    if (xhr && xhr.status === 413) {
      msg = xhr.statusText || "Request Entity Too Large";
    }
    app.alertError(msg);
  }

  function createUUID() {
    var s = [];
    var hexDigits = "0123456789abcdef";
    for (var i = 0; i < 36; i++) {
      s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);
    s[8] = s[13] = s[18] = s[23] = "-";

    var uuid = s.join("");
    return uuid;
  }

  return uploads;
});
