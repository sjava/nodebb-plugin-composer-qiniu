# Qiniu Composer for NodeBB

nodebb 上传文件到七牛的插件，之前有一个 [nodebb-plugin-qiniu-img](https://www.npmjs.com/package/nodebb-plugin-qiniu-img)，但是工作机制是先上传的本地服务器，然后再从服务器上传到七牛，效率很低，而且更严重的问题是大文件上传总是莫名失败，判断可能是七牛的 Node.js 的 SDK 有问题。为了解决这个问题，最终决定，直接修改 composer，从前端直接上传文件到七牛服务器。

## 强调说明

这个扩展只能处理在回复面板中拖拽或者上传的文件和图片。头像，个人资料里的封面图片等等这里的上传是不通过此插件的，所以如果也想让这些地方的资源文件上传的七牛服务器的话，建议配合只用 [nodebb-plugin-qiniu-img](https://www.npmjs.com/package/nodebb-plugin-qiniu-img)。可以一起使用，并不冲突。

## Screenshots

### Desktop
![Desktop Composer](screenshots/desktop.png?raw=true)

### Mobile Devices
![Mobile Composer](screenshots/mobile.png?raw=true)

### Admin Setting
![Admin Setting](Screenshots/admin.png?raw=true)
