'use strict';
'require view';
'require form';
'require rpc';
'require uci';
'require fs';
'require poll';

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
		s.tab('car', _('Car'));
		s.tab('network', _('Network'));
		s.tab('internet', _('Car internet'));
		s.tab('iphone', _('iPhone'));
		s.tab('sound', _('Sound'));
		s.tab('reach', _('Own address'));
		s.tab('debug', _('Diagnostics'));


		o = s.taboption('car', form.DummyValue, '_status', _('Status'));
		o.rawhtml = true;
		o.cfgvalue = function() {
			return running(data[0])
				? '<b style="color:green">' + _('Running') + '</b>'
				: '<b style="color:red">' + _('Not running') + '</b>';
		};

		o = s.taboption('network', form.DummyValue, '_network_warning', _('Network warning'));
		o.renderWidget = function() {
			return E('div', { 'id': 'dashplay-network-warning', 'role': 'status', 'style': 'color:#b45309' });
		};

		o = s.taboption('iphone', form.DummyValue, '_links', _('Open'));
		o.rawhtml = true;
		o.cfgvalue = function() {
			return '<a class="btn cbi-button" target="_blank" href="http://' + host + ':' + port + '/">' +
				_('DashPlay settings (add iPhone)') + '</a> ' +
				'<a class="btn cbi-button" target="_blank" href="https://' + host + ':18443/">' +
				_('CarPlay screen') + '</a>';
		};

		o = s.taboption('network', form.Flag, 'enabled', _('Enable'));
		o.rmempty = false;

		o = s.taboption('network', form.ListValue, 'wifi', _('Wi-Fi handed to the iPhone'),
			_('The iPhone joins this network for wireless CarPlay. The router\'s own access point works best; a network the router joins as a client must be in a firewall zone that accepts input.'));
		o.value('auto', _('Automatic (first access point, 5 GHz first)'));
		uci.sections('wireless', 'wifi-iface', function(section) {
			if (section.mode === 'ap' || section.mode === 'sta')
				o.value(section['.name'], '%s (%s)'.format(section.ssid || section['.name'],
					section.mode === 'ap' ? _('access point') : _('client')));
		});
		o.value('external', _('Another router\'s Wi-Fi (enter below)'));

		// A travel router with better radios, its uplink this router over USB or a cable (issue #2, 2026-10-19): its
		// Wi-Fi is not in /etc/config/wireless, so it is entered here and handed over as entered.
		o = s.taboption('network', form.Value, 'external_ssid', _('Other router: Wi-Fi name'),
			_('Set the other router up as an access point bridged into this router\'s LAN (no DHCP of its own, its LAN port or USB tethering in the bridge), so that phones and the head unit get their addresses from this router. Give its Wi-Fi a fixed channel.'));
		o.depends('wifi', 'external');
		o.datatype = 'maxlength(32)';
		o.rmempty = false;

		o = s.taboption('network', form.ListValue, 'external_security', _('Other router: password type'));
		o.value('wpa2', _('WPA2 personal (also WPA2/WPA3 mixed)'));
		o.value('wpa3', _('WPA3 personal only'));
		o.value('open', _('None (open)'));
		o.default = 'wpa2';
		o.depends('wifi', 'external');

		o = s.taboption('network', form.Value, 'external_key', _('Other router: Wi-Fi password'));
		o.password = true;
		o.datatype = 'wpakey';
		o.depends({ wifi: 'external', external_security: 'wpa2' });
		o.depends({ wifi: 'external', external_security: 'wpa3' });

		o = s.taboption('network', form.Value, 'external_channel', _('Other router: Wi-Fi channel'),
			_('The channel the other router actually uses, e.g. 149 or 6. Set a fixed one there, then check its status page or a phone\'s Wi-Fi details: some routers move the primary channel within the band (36 became 40 in a test). The iPhone is told this channel.'));
		o.datatype = 'range(1,196)';
		o.depends('wifi', 'external');
		o.rmempty = false;

		o = s.taboption('network', form.Value, 'external_network', _('Other router: bridged into network'),
			_('The interface of this router the other router is bridged into; DashPlay serves the CarPlay page on its address.'));
		o.datatype = 'uciname';
		o.placeholder = 'lan';
		o.depends('wifi', 'external');

		// A Tesla's browser refuses LAN addresses and hands the steering wheel to the car's own media only (2026-10-14):
		// one switch for all of it, the LAN move of shared_lan, music, calls and Siri left to the car's Bluetooth,
		// and the Tesla browser's fullscreen.
		o = s.taboption('car', form.Flag, 'tesla_mode', _('Tesla mode'),
			_('For a Tesla. The router\'s Wi-Fi network moves to %s, which the Tesla browser opens (it refuses LAN addresses such as 192.168.x.x); music, calls and Siri are left to the car (both switches below, turned on); the fullscreen button works in the Tesla browser. Pair the iPhone with the Tesla over Bluetooth and pick it as the media source. In the Tesla\'s Wi-Fi settings turn on "Remain connected in Drive", else the picture stops out of Park. Afterwards open this admin page at %s and reconnect the car and phones to the Wi-Fi. Turning it off puts the previous address back.').format('100.96.0.1', 'http://100.96.0.1/'));
		o.rmempty = false;
		o.default = '0';

		// The same for any car whose own Bluetooth is paired with the iPhone; Tesla mode turns both on.
		o = s.taboption('sound', form.Flag, 'car_music', _('Music over the car\'s Bluetooth'),
			_('Pair the iPhone with the car over Bluetooth and pick it as the media source: the steering wheel, media card and volume then work as with any phone. The CarPlay page shows the screen and plays navigation prompts, louder. If music ever comes without sound, choose the car as audio output in the iPhone\'s Control Center.'));
		o.rmempty = false;
		o.default = '0';
		o.retain = true;
		o.depends('tesla_mode', '0');

		o = s.taboption('sound', form.Flag, 'car_voice', _('Calls and Siri over the car\'s Bluetooth'),
			_('Calls and Siri use the car\'s own microphone and speakers through its Bluetooth (the iPhone must be paired with the car), not the CarPlay page. Worth a try when calls through the page echo.'));
		o.rmempty = false;
		o.default = '0';
		o.retain = true;
		o.depends('tesla_mode', '0');

		o = s.taboption('network', form.Value, 'settings_port', _('Settings page port'));
		o.datatype = 'port';
		o.placeholder = '18080';

		o = s.taboption('internet', form.ListValue, 'answer_tesla_checks', _('Tesla offline checks'),
			_('Without a working SIM uplink, answer Tesla connectivity checks so it accepts this Wi-Fi. Tesla music and maps then have no internet; CarPlay still works. To keep Tesla apps online, insert a working SIM. The current F50 driver cannot join a phone hotspot while keeping its own hotspot. Automatic probes the WAN path and restores the original DNS and DHCP when it returns. This release needs an in-car retest, including loss of SIM signal.'));
		o.value('auto', _('Automatic (recommended)'));
		o.value('1', _('Enable only without upstream'));
		o.value('0', _('Off (use upstream)'));
		o.default = 'auto';
		o.depends('tesla_mode', '1');
		o = s.taboption('debug', form.DummyValue, '_debug', _('Diagnostics'));
		o.cfgvalue = function() { return _('Download diagnostics from the DashPlay settings page. Changes take about one minute and interrupt CarPlay briefly.'); };

		o = s.taboption('reach', form.DummyValue, '_reach', _('Usually not needed'));
		o.rawhtml = true;
		o.cfgvalue = function() {
			return _('Try in this order: 1. The head unit warns that the certificate is not trusted: tap continue. 2. It offers no way to continue: install the DashPlay CA certificate on the head unit (DashPlay settings page, "Download the box CA certificate"), or, when it cannot install one, set an own name below. 3. It refuses to open a LAN address such as 192.168.x.x, even by name (Tesla does): turn on "Head unit refuses every LAN address" below, or, when the router and the head unit have IPv6, set "Public IPv6 address for the name" to "Also".');
		};

		// The real address, not a "<name>" placeholder: descriptions are HTML, so that one rendered as "https://:18443/".
		o = s.taboption('reach', form.Value, 'name', _('Address name'),
			_('The head unit opens the CarPlay page by this name, which the router answers on its own Wi-Fi; the page\'s certificate is made for it. On the router\'s access point the head unit opens %s').format(
				'https://' + (uci.get('dashplay', 'main', 'name') || 'dashplay.lan') + ':18443/'));
		o.datatype = 'hostname';
		o.placeholder = 'dashplay.lan';

		// For car browsers that refuse every private address, by name too, and use no IPv6 on the Wi-Fi (Tesla,
		// 2026-10-14): the LAN moves to 100.96.0.1/24, outside the private ranges (supervisor_openwrt.SHARED_LAN).
		o = s.taboption('reach', form.Flag, 'shared_lan', _('Head unit refuses every LAN address (e.g. Tesla)'),
			_('Tesla\'s browser opens no LAN address such as 192.168.x.x, not even by name. Turned on, the router\'s own Wi-Fi network moves to %s (devices get 100.96.0.x): that range is not a private one, so such browsers open it, and the address name and own name follow. Afterwards open this admin page at %s and reconnect the head unit and phones to the Wi-Fi. Turning it off puts the previous address back.').format('100.96.0.1', 'http://100.96.0.1/'));
		o.rmempty = false;
		o.default = '0';

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
		o = s.taboption('iphone', form.Value, 'idle_release', _('Release the iPhone after (seconds)'),
			_('Without any page showing the picture for this long, wireless CarPlay ends and the iPhone stops sending its screen; opening the page invites it again (about 7 s). 0: never end it.'));
		o.datatype = 'uinteger';
		o.placeholder = '300';

		return m.render().then(function(node) {
			var warning = node.querySelector('#dashplay-network-warning');
			function updateWarning() {
				return L.resolveDefault(fs.read('/var/run/dashplay/network-status.json'), '').then(function(raw) {
					var state;
					try { state = JSON.parse(raw); } catch (e) { state = {}; }
					warning.textContent = Date.now() / 1000 - state.checked_at < 45
						? state.warning || '' : _('Network check unavailable (service starting or stopped).');
				});
			}
			poll.add(updateWarning, 10);
			return updateWarning().then(function() { return node; });
		});
	}
});
