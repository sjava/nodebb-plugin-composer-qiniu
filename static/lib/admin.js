'use strict';
/* globals $, app, socket */

define('admin/plugins/composer-qiniu', ['settings'], function(Settings) {

	var ACP = {};

	ACP.init = function() {
		Settings.load('composer-qiniu', $('.composer-qiniu-settings'));

		$('#save').on('click', function() {
			Settings.save('composer-qiniu', $('.composer-qiniu-settings'), function() {
				app.alert({
					type: 'success',
					alert_id: 'composer-qiniu-saved',
					title: 'Settings Saved',
					message: 'Please reload your NodeBB to apply these settings',
					clickfn: function() {
						socket.emit('admin.reload');
					}
				});
			});
		});
	};

	return ACP;
});