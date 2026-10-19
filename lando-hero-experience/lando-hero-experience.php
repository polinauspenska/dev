<?php
/**
 * Plugin Name:       LN Hero Experience
 * Description:       An editable, dependency-free cinematic hero experience.
 * Version:           4.4.24
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Nasrin Nazeer
 * License:           GPL-2.0-or-later
 * Text Domain:       ln-hero
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'LN_HERO_VERSION', '4.4.24' );
define( 'LN_HERO_URL', plugin_dir_url( __FILE__ ) );

/** Register the editable fields when ACF is available. */
function ln_hero_register_fields() {
	if ( ! function_exists( 'acf_add_local_field_group' ) ) {
		return;
	}

	acf_add_local_field_group(
		array(
			'key'      => 'group_ln_hero',
			'title'    => 'Hero Experience Settings',
			'fields'   => array(
				array( 'key' => 'field_ln_eyebrow', 'label' => 'Eyebrow', 'name' => 'ln_eyebrow', 'type' => 'text', 'default_value' => '' ),
				array( 'key' => 'field_ln_title', 'label' => 'Main title', 'name' => 'ln_title', 'type' => 'text', 'default_value' => '' ),
				array( 'key' => 'field_ln_subtitle', 'label' => 'Subtitle', 'name' => 'ln_subtitle', 'type' => 'text', 'default_value' => '' ),
				array( 'key' => 'field_ln_background', 'label' => 'Background image', 'name' => 'ln_background', 'type' => 'image', 'return_format' => 'array', 'preview_size' => 'medium' ),
				array( 'key' => 'field_ln_foreground', 'label' => 'Foreground driver image', 'name' => 'ln_foreground', 'type' => 'image', 'return_format' => 'array', 'preview_size' => 'medium', 'instructions' => 'Leave empty to use the bundled fictional driver.' ),
				array( 'key' => 'field_ln_helmet', 'label' => 'Helmet portrait', 'name' => 'ln_helmet', 'type' => 'image', 'return_format' => 'array', 'preview_size' => 'medium', 'instructions' => 'Use a full portrait aligned exactly with the foreground portrait. Leave empty to use the bundled orange-and-blue helmet portrait.' ),
				array( 'key' => 'field_ln_visor', 'label' => 'Visor overlay', 'name' => 'ln_visor', 'type' => 'image', 'return_format' => 'array', 'preview_size' => 'medium', 'instructions' => 'Leave empty to use the bundled original visor.' ),
				array( 'key' => 'field_ln_race_label', 'label' => 'Card label', 'name' => 'ln_race_label', 'type' => 'text', 'default_value' => '' ),
				array( 'key' => 'field_ln_race_name', 'label' => 'Card title', 'name' => 'ln_race_name', 'type' => 'text', 'default_value' => '' ),
				array( 'key' => 'field_ln_cta_text', 'label' => 'Button text', 'name' => 'ln_cta_text', 'type' => 'text', 'default_value' => '' ),
				array( 'key' => 'field_ln_cta_url', 'label' => 'Button URL', 'name' => 'ln_cta_url', 'type' => 'url', 'default_value' => '#next' ),
				array( 'key' => 'field_ln_accent', 'label' => 'Accent colour', 'name' => 'ln_accent', 'type' => 'color_picker', 'default_value' => '#c7ff00' ),
			),
			'location' => array(
				array(
					array( 'param' => 'post_type', 'operator' => '==', 'value' => 'page' ),
				),
			),
		)
	);
}
add_action( 'acf/init', 'ln_hero_register_fields' );

/** Optional WordPress menu. Assign it under Appearance > Menus. */
function ln_hero_register_menu() {
	register_nav_menu( 'ln-hero-menu', __( 'LN Hero Menu', 'ln-hero' ) );
}
add_action( 'after_setup_theme', 'ln_hero_register_menu' );

/** Fallback menu shown until a menu is assigned to the LN Hero Menu location. */
function ln_hero_menu_fallback() {
	$items = array( 'HOME' => home_url( '/' ), 'ON TRACK' => '#next', 'OFF TRACK' => '#next', 'CALENDAR' => '#next', 'STORE' => '#next' );
	echo '<nav class="ln-menu-links"><ul class="ln-menu-list">';
	foreach ( $items as $label => $url ) {
		echo '<li><a href="' . esc_url( $url ) . '"' . ( 'HOME' === $label ? ' class="is-current"' : '' ) . '>' . esc_html( $label ) . '</a></li>';
	}
	echo '</ul></nav>';
}


function ln_hero_page_has_shortcode() {
	if ( ! is_singular() ) {
		return false;
	}
	$post = get_queried_object();
	return $post instanceof WP_Post && has_shortcode( $post->post_content, 'ln_hero' );
}

/** Load animation assets only on the page containing our hero. */
function ln_hero_enqueue_assets() {
	if ( ! ln_hero_page_has_shortcode() ) {
		return;
	}

	wp_enqueue_style( 'ln-hero', LN_HERO_URL . 'assets/css/hero.css', array(), LN_HERO_VERSION );
	wp_enqueue_style( 'ln-hero-v31', LN_HERO_URL . 'assets/css/hero-v31.css', array( 'ln-hero' ), LN_HERO_VERSION );
	wp_enqueue_script( 'ln-hero', LN_HERO_URL . 'assets/js/hero.js', array(), LN_HERO_VERSION, true );
	wp_enqueue_script( 'ln-approved-flow', LN_HERO_URL . 'assets/js/approved-flow.js', array( 'ln-hero' ), LN_HERO_VERSION, true );
}
add_action( 'wp_enqueue_scripts', 'ln_hero_enqueue_assets' );

function ln_hero_body_class( $classes ) {
	if ( ln_hero_page_has_shortcode() ) {
		$classes[] = 'ln-hero-page';
	}
	return $classes;
}
add_filter( 'body_class', 'ln_hero_body_class' );

function ln_hero_field( $name, $fallback = '' ) {
	$value = function_exists( 'get_field' ) ? get_field( $name ) : '';
	return $value ? $value : $fallback;
}

/** Render the hero using [ln_hero]. */
function ln_hero_shortcode() {
	$title      = ln_hero_field( 'ln_title' );
	$subtitle   = ln_hero_field( 'ln_subtitle' );
	$eyebrow    = ln_hero_field( 'ln_eyebrow' );
	$background = ln_hero_field( 'ln_background' );
	$foreground = ln_hero_field( 'ln_foreground' );
	$helmet     = ln_hero_field( 'ln_helmet' );
	$visor      = ln_hero_field( 'ln_visor' );
	$race_label = ln_hero_field( 'ln_race_label' );
	$race_name  = ln_hero_field( 'ln_race_name' );
	$cta_text   = ln_hero_field( 'ln_cta_text' );
	$cta_url    = ln_hero_field( 'ln_cta_url', '#next' );
	$accent     = ln_hero_field( 'ln_accent', '#c7ff00' );

	$background_url = is_array( $background ) && ! empty( $background['url'] ) ? $background['url'] : '';
	$foreground_url = is_array( $foreground ) && ! empty( $foreground['url'] ) ? $foreground['url'] : '';
	// v4.4.12: force the bundled approved gold helmet so an older ACF helmet selection cannot override it.
	$helmet_url     = LN_HERO_URL . 'assets/images/gold-helmet-portrait-v4418.webp';
	$visor_url      = is_array( $visor ) && ! empty( $visor['url'] ) ? $visor['url'] : LN_HERO_URL . 'assets/images/racing-visor.webp';

	ob_start();
	?>
	<div class="ln-loader" aria-hidden="true">
		<div class="ln-loader__logo"><img src="<?php echo esc_url( LN_HERO_URL . 'assets/images/ln-head-mark.png' ); ?>" alt=""><img src="<?php echo esc_url( LN_HERO_URL . 'assets/images/ln-head-mark.png' ); ?>" alt=""><img src="<?php echo esc_url( LN_HERO_URL . 'assets/images/ln-head-mark.png' ); ?>" alt=""></div>
		<div class="ln-loader__status"><span>LOADING</span><div class="ln-loader__line"></div></div>
	</div>
	<section class="ln-hero" style="--ln-accent: <?php echo esc_attr( $accent ); ?>;">
		<div class="ln-hero__stage">
			<img class="ln-head-mark" src="<?php echo esc_url( LN_HERO_URL . 'assets/images/ln-head-mark.png' ); ?>" alt="" aria-hidden="true">
			<header class="ln-hero__nav">
				<a class="ln-hero__mark" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="Home"><b>LANDO</b><strong>NORRIS</strong></a>
				<div class="ln-hero__actions">
					<a class="ln-hero__button" href="<?php echo esc_url( $cta_url ); ?>"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.4 8.5h13.2l1 11.1a2 2 0 0 1-2 2.2H6.4a2 2 0 0 1-2-2.2l1-11.1Z"/><path d="M8.2 8.5V6.7a3.8 3.8 0 0 1 7.6 0v1.8"/><path d="M7.2 6.2h1M15.8 6.2h1"/></svg>STORE</a>
					<button class="ln-menu-toggle" type="button" aria-label="Open menu" aria-expanded="false"><i></i><i></i></button>
				</div>
			</header>
			<div class="ln-menu-panel" aria-hidden="true">
				<div class="ln-menu-gallery">
					<figure><img src="<?php echo esc_url( LN_HERO_URL . 'assets/images/68302ff5ff89a9a4afb8c19e_ln-home-helm-large.webp' ); ?>" alt="Lando with racing helmet"></figure>
					<figure><img src="<?php echo esc_url( LN_HERO_URL . 'assets/images/menu-paddock.webp' ); ?>" alt="Driver in the paddock"></figure>
					<figure><img src="<?php echo esc_url( LN_HERO_URL . 'assets/images/6830302dadd0727e6ac034dd_ln-social-img-6.webp' ); ?>" alt="Driver celebrating after a race"></figure>
					<figure><img src="<?php echo esc_url( LN_HERO_URL . 'assets/images/68302babcf12f0111d96322e_ln-home-horiz-3.webp' ); ?>" alt="Driver at the circuit"></figure>
				</div>
				<div class="ln-menu-content">
					<?php
					if ( has_nav_menu( 'ln-hero-menu' ) ) {
						wp_nav_menu( array( 'theme_location' => 'ln-hero-menu', 'container' => 'nav', 'container_class' => 'ln-menu-links', 'menu_class' => 'ln-menu-list', 'depth' => 1, 'fallback_cb' => false ) );
					} else {
						ln_hero_menu_fallback();
					}
					?>
					<div class="ln-menu-emblem"><svg viewBox="0 0 150 90" aria-hidden="true"><path d="M43 70C20 57 19 28 37 12M107 70c23-13 24-42 6-58M54 66C42 51 45 27 61 18h28c16 9 19 33 7 48-10 10-32 10-42 0Z"/><path d="M61 42h28M66 53h18"/></svg><strong>MOTORSPORT<br>SINCE 2019</strong></div>
					<div class="ln-menu-footer"><strong>BUSINESS ENQUIRIES</strong><div><a href="#">TIKTOK</a><a href="#">INSTAGRAM</a><a href="#">YOUTUBE</a><a href="#">TWITCH</a></div></div>
				</div>
			</div>
			<div class="ln-live-scene" aria-hidden="true">
				<div class="ln-hero__background"<?php echo $background_url ? ' style="--ln-bg:url(' . esc_url( $background_url ) . ')"' : ''; ?>></div>
				<div class="ln-hero__glow"></div>
				<div class="ln-fluid-bg"><i></i><i></i><i></i><i></i></div>
				<canvas class="ln-webgl-bg"></canvas>



			<div class="ln-hero__person-wrap" role="button" tabindex="0" aria-label="Reveal racing helmet">
				<img class="ln-hero__person" src="<?php echo esc_url( $foreground_url ); ?>" alt="Racing driver portrait" fetchpriority="high" decoding="sync">
				<div class="ln-liquid-layer ln-liquid-layer--helmet"><img class="ln-hero__helmet-state" src="<?php echo esc_url( $helmet_url ); ?>" alt="" fetchpriority="high" decoding="sync"></div>
				<canvas class="ln-three-helmet"
					data-model="<?php echo esc_url( LN_HERO_URL . 'assets/models/helmet-21.glb' ); ?>"
					data-basecolor="<?php echo esc_url( LN_HERO_URL . 'assets/textures/Norris_Helmet_mat_BaseColor.webp' ); ?>"
					data-normal="<?php echo esc_url( LN_HERO_URL . 'assets/textures/Norris_Helmet_mat_Normal.webp' ); ?>"
					data-roughness="<?php echo esc_url( LN_HERO_URL . 'assets/textures/Norris_Helmet_mat_Roughness.webp' ); ?>"
					data-metallic="<?php echo esc_url( LN_HERO_URL . 'assets/textures/Norris_Helmet_mat_Metallic.webp' ); ?>"
					data-noise="<?php echo esc_url( LN_HERO_URL . 'assets/textures/noise-03.webp' ); ?>"
					data-head-diffuse="<?php echo esc_url( LN_HERO_URL . 'assets/textures/head-diffuse.webp' ); ?>"
					data-head-depth="<?php echo esc_url( LN_HERO_URL . 'assets/textures/head-depth.webp' ); ?>"
					data-head-alpha="<?php echo esc_url( LN_HERO_URL . 'assets/textures/head-alpha.webp' ); ?>"
					data-head-normal="<?php echo esc_url( LN_HERO_URL . 'assets/textures/head-normal.webp' ); ?>"
					data-head-roughness="<?php echo esc_url( LN_HERO_URL . 'assets/textures/head-roughness.webp' ); ?>"
					data-head-shadow="<?php echo esc_url( LN_HERO_URL . 'assets/textures/head-shadow-softer-edit.webp' ); ?>"
					data-draco="<?php echo esc_url( LN_HERO_URL . 'assets/draco/' ); ?>" aria-hidden="true"></canvas>
			</div>
			</div>
			<div class="ln-scroll-heading" aria-hidden="true"><img src="<?php echo esc_url( LN_HERO_URL . 'assets/images/ln-head-mark.png' ); ?>" alt=""><span>MESSAGE FROM LANDO</span></div>

			<div class="ln-marquee" aria-hidden="true">
				<div class="ln-marquee__row ln-marquee__row--lime"><span>BEYOND THE LIMIT · BUILT TO MOVE · ALWAYS FORWARD · </span><span>BEYOND THE LIMIT · BUILT TO MOVE · ALWAYS FORWARD · </span></div>
				<div class="ln-marquee__row ln-marquee__row--white"><span>NO LIMITS · ONLY PROGRESS · RACE THE FUTURE · </span><span>NO LIMITS · ONLY PROGRESS · RACE THE FUTURE · </span></div>
			</div>
			<figure class="ln-scroll-card" aria-hidden="true">
				<div class="ln-scroll-card__scene">
					<span class="ln-scroll-card__bg"></span>
					<span class="ln-scroll-card__mini-logo"><b>LANDO</b><strong>NORRIS</strong></span>
					<img src="<?php echo esc_url( $foreground_url ); ?>" alt="">
					<span class="ln-scroll-card__mini-race">NEXT RACE<br><b>BARCELONA GP</b></span>
				</div>
				<svg class="ln-signature" viewBox="0 0 360 150"><path d="M18 104 C53 44 50 132 91 76 S124 38 118 106 C153 58 179 35 166 103 C205 53 224 41 210 104 C246 70 280 53 340 48"/><path d="M55 119 C138 91 238 88 330 98"/></svg>
				<figcaption><span>THE DRIVE</span><strong>NO LIMITS.<br>ONLY PROGRESS.</strong></figcaption>
			</figure>

			<div class="ln-hero__message" aria-hidden="true">
				<p>WE RACE AT THE EDGE</p>
				<strong>MOVE <em>BEYOND</em><br>THE EXPECTED.</strong>
				<span>01 / LIMITLESS</span>
			</div>

			<aside class="ln-hero__race-card">
				<span>NEXT RACE</span>
				<div class="ln-race-rotator">
					<div class="ln-race-face"><svg viewBox="0 0 120 54" aria-hidden="true"><path d="M10 34c15-3 18-18 34-16 11 1 10 13 22 13 10 0 14-12 25-11 8 1 10 8 19 5"/></svg><strong><?php echo esc_html( $race_name ); ?></strong></div>
					<div class="ln-race-face"><svg viewBox="0 0 120 58" aria-hidden="true"><path d="M35 45c-14-6-18-20-12-31M85 45c14-6 18-20 12-31M42 42c-8-11-5-27 8-34h20c13 7 16 23 8 34-8 8-28 8-36 0Z"/><path d="M50 26h20M54 34h12"/></svg><strong>McLAREN F1<br>SINCE 2019</strong></div>
				</div>
				<small>01 — 02</small>
			</aside>

			<div class="ln-hero__scroll"><span>SCROLL TO DRIVE</span><i></i></div>
		</div>
	</section>
	<section class="ln-after" id="next">
		<p>BEYOND THE LIMIT</p>
		<h2>BUILT TO MOVE.</h2>
	</section>
	<?php
	return ob_get_clean();
}
add_shortcode( 'ln_hero', 'ln_hero_shortcode' );
