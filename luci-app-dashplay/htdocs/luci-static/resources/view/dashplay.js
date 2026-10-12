'use strict';
'require view';
'require form';
'require rpc';
'require uci';

// Network settings stay in OpenWrt; this page picks the Wi-Fi handed to the iPhone and links to the
// DashPlay settings page (adding iPhones, certificate, diagnostics) and the CarPlay viewer.
var callServiceList = rpc.declare({
	object: 'service',
	method: 'list',
	params: [ 'name' ],
	expect: { '': {} }
});

function running(services) {
	var instances = (services && services.dashplay && services.dashplay.instances) || {};
	return Object.keys(instances).some(function(name) { return instances[name].running; });
}

return view.extend({
	load: function() {
		return Promise.all([
			L.resolveDefault(callServiceList('dashplay'), {}),
			uci.load('wireless'),
			uci.load('dashplay')   // read below (port, name) before the form loads it
		]);
	},

	render: function(data) {
		var host = window.location.hostname;
		var port = uci.get('dashplay', 'main', 'settings_port') || '18080';
		var m, s, o;

		m = new form.Map('dashplay', _('DashPlay'),
			_('CarPlay in the car\'s web browser. Set up Wi-Fi under Network → Wireless as usual; DashPlay hands one of these networks to the iPhone over Bluetooth, and the head unit opens the CarPlay page on the same network.'));

		s = m.section(form.NamedSection, 'main', 'dashplay');

		o = s.option(form.DummyValue, '_status', _('Status'));
		o.rawhtml = true;
		o.cfgvalue = function() {
			return running(data[0])
				? '<b style="color:green">' + _('Running') + '</b>'
				: '<b style="color:red">' + _('Not running') + '</b>';
		};

		o = s.option(form.DummyValue, '_links', _('Open'));
		o.rawhtml = true;
		o.cfgvalue = function() {
			return '<a class="btn cbi-button" target="_blank" href="http://' + host + ':' + port + '/">' +
				_('DashPlay settings (add iPhone)') + '</a> ' +
				'<a class="btn cbi-button" target="_blank" href="https://' + host + ':18443/">' +
				_('CarPlay screen') + '</a>';
		};

		o = s.option(form.Flag, 'enabled', _('Enable'));
		o.rmempty = false;

		o = s.option(form.ListValue, 'wifi', _('Wi-Fi handed to the iPhone'),
			_('The iPhone joins this network for wireless CarPlay. The router\'s own access point works best; a network the router joins as a client must be in a firewall zone that accepts input.'));
		o.value('auto', _('Automatic (first access point, 5 GHz first)'));
		uci.sections('wireless', 'wifi-iface', function(section) {
			if (section.mode === 'ap' || section.mode === 'sta')
				o.value(section['.name'], '%s (%s)'.format(section.ssid || section['.name'],
					section.mode === 'ap' ? _('access point') : _('client')));
		});

		o = s.option(form.Value, 'settings_port', _('Settings page port'));
		o.datatype = 'port';
		o.placeholder = '18080';

		// The real address, not a "<name>" placeholder: descriptions are HTML, so that one rendered as "https://:18443/".
		o = s.option(form.Value, 'name', _('Address name'),
			_('On the router\'s access point the head unit opens %s').format(
				'https://' + (uci.get('dashplay', 'main', 'name') || 'dashplay.lan') + ':18443/'));
		o.datatype = 'hostname';
		o.placeholder = 'dashplay.lan';

		return m.render();
	}
});
