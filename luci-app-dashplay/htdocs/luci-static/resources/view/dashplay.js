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
		s.tab('general', _('General'));
		// Name, certificate and public address together, each saying which problem it solves (2026-10-13).
		s.tab('reach', _('When the head unit cannot open the page'));

		o = s.taboption('general', form.DummyValue, '_status', _('Status'));
		o.rawhtml = true;
		o.cfgvalue = function() {
			return running(data[0])
				? '<b style="color:green">' + _('Running') + '</b>'
				: '<b style="color:red">' + _('Not running') + '</b>';
		};

		o = s.taboption('general', form.DummyValue, '_links', _('Open'));
		o.rawhtml = true;
		o.cfgvalue = function() {
			return '<a class="btn cbi-button" target="_blank" href="http://' + host + ':' + port + '/">' +
				_('DashPlay settings (add iPhone)') + '</a> ' +
				'<a class="btn cbi-button" target="_blank" href="https://' + host + ':18443/">' +
				_('CarPlay screen') + '</a>';
		};

		o = s.taboption('general', form.Flag, 'enabled', _('Enable'));
		o.rmempty = false;

		o = s.taboption('general', form.ListValue, 'wifi', _('Wi-Fi handed to the iPhone'),
			_('The iPhone joins this network for wireless CarPlay. The router\'s own access point works best; a network the router joins as a client must be in a firewall zone that accepts input.'));
		o.value('auto', _('Automatic (first access point, 5 GHz first)'));
		uci.sections('wireless', 'wifi-iface', function(section) {
			if (section.mode === 'ap' || section.mode === 'sta')
				o.value(section['.name'], '%s (%s)'.format(section.ssid || section['.name'],
					section.mode === 'ap' ? _('access point') : _('client')));
		});

		o = s.taboption('general', form.Value, 'settings_port', _('Settings page port'));
		o.datatype = 'port';
		o.placeholder = '18080';

		o = s.taboption('reach', form.DummyValue, '_reach', _('Usually not needed'));
		o.rawhtml = true;
		o.cfgvalue = function() {
			return _('Try in this order: 1. The head unit warns that the certificate is not trusted: tap continue. 2. It offers no way to continue: install the DashPlay CA certificate on the head unit (DashPlay settings page, "Download the box CA certificate"), or, when it cannot install one, set an own name below. 3. It refuses to open a LAN address such as 192.168.x.x: set "Public IPv6 address for the name" to "Also".');
		};

		// The real address, not a "<name>" placeholder: descriptions are HTML, so that one rendered as "https://:18443/".
		o = s.taboption('reach', form.Value, 'name', _('Address name'),
			_('The head unit opens the CarPlay page by this name, which the router answers on its own Wi-Fi; the page\'s certificate is made for it. On the router\'s access point the head unit opens %s').format(
				'https://' + (uci.get('dashplay', 'main', 'name') || 'dashplay.lan') + ':18443/'));
		o.datatype = 'hostname';
		o.placeholder = 'dashplay.lan';

		// For car browsers that refuse a private address: the router answers its own public IPv6 address itself,
		// so the page still comes over the Wi-Fi (F50, 2026-10-13). Needs that address and the head unit on IPv6.
		o = s.taboption('reach', form.ListValue, 'public_ipv6', _('Public IPv6 address for the name'),
			_('Some head units refuse to open a LAN address. The name can also point at this router\'s own public IPv6 address: the head unit then sees a public address, while the picture still comes straight over the Wi-Fi. Needs a public IPv6 address on the router and IPv6 handed on to its Wi-Fi. "Only" helps to check that it works; the DashPlay settings page then opens by the LAN address, not by the name.'));
		o.value('0', _('No (LAN address only)'));
		o.value('1', _('Also (beside the LAN address)'));
		o.value('2', _('Only (instead of the LAN address)'));
		o.default = '0';

		// For car browsers that refuse DashPlay's own certificate and offer no "continue" (2026-10-13): a public
		// certificate needs a name of one's own. The router obtains it by DNS-01, so nothing has to reach it.
		o = s.taboption('reach', form.Value, 'duckdns_domain', _('Own name (DuckDNS sub-domain)'),
			_('Only needed when the head unit\'s browser blocks the certificate warning with no way to continue. Sign up for free at duckdns.org, add a sub-domain and enter it with the token shown there. The address name then becomes that name (e.g. mycar.duckdns.org): DashPlay points it at this router and obtains a free Let\'s Encrypt certificate, renewed automatically, so the head unit opens the page without a warning. No port needs to be opened; the router needs internet access.'));
		o.datatype = 'and(hostname,maxlength(63))';
		o.placeholder = 'mycar';

		o = s.taboption('reach', form.Value, 'duckdns_token', _('DuckDNS token'));
		o.password = true;

		// A trade-off: a released iPhone stays cool near a router left on; a page opened later waits ~7 s.
		o = s.taboption('general', form.Value, 'idle_release', _('Release the iPhone after (seconds)'),
			_('Without any page showing the picture for this long, wireless CarPlay ends and the iPhone stops sending its screen; opening the page invites it again (about 7 s). 0: never end it.'));
		o.datatype = 'uinteger';
		o.placeholder = '300';

		return m.render();
	}
});
