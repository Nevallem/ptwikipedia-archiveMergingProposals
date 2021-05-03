/**
 * Archives merging proposals in Wikipédia:Fusão/Central de fusões page on ptwikipedia
 *
 * @author [[w:pt:User:!Silent]]
 * @date 03/aug/2016
 * @update 28/dec/2019
 */
/* jshint laxbreak: true */
/* global $, mw */

( function() {
'use strict';

var amp,
	api = new mw.Api();

// Messages
mw.messages.set( {
	'amp-summary': 'Arquivando proposta de fusão encerrada, com um [[Usuário:!Silent/archiveMergingProposals.js|script]]',
	'amp-archiveButton': 'Arquivar',
	'amp-filing': 'Arquivando...',
	'amp-filing-finished': 'Arquivamento terminado.',
	'amp-archiveButton-title': 'Arquiva a proposta de fusão',
	'amp-dialog-title': 'Arquivar proposta de fusão',
	'amp-dialog-result': 'Resultado da proposta',
	'amp-dialog-result-1': 'Aprovada',
	'amp-dialog-result-2': 'Reprovada',
	'amp-dialog-commentLabel': 'Comentário de encerramento da proposta',
	'amp-dialog-commentPlaceholder': 'Não precisa assinar',
} );

/**
 * @object amp
 */
amp = {
	/**
	 * Messages
	 * @param {string} name Name of the message
	 * @param {string|number} [$N] Dynamic parameters to the message (i.e. the values for $1, $2, etc)
	 * @see [[mw:ResourceLoader/Default_modules#mediaWiki.message]]
	 * @return {string}
	 */
	message: function ( /*name[, $1[, $2[, ... $N ]]]*/ ) {
		return mw.message.apply( this, arguments ).plain();
	},

	/**
	 * Edit function
	 * @param {object} info Edit params
	 * @return {jQuery.Deferred}
	 * @see see [[mw:API:Edit]]
	 */
	editPage: function( info ) {
		var apiDeferred = $.Deferred(),
			edit = function( value ) {
				if ( $.isFunction( info.text ) ) {
					info.text = info.text( value );
				}

				info.watchlist = 'preferences';
				info.summary = amp.message( 'amp-summary' );
				info.minor = true;

				api.editPage( info ).done( function() {
					apiDeferred.resolve( value );
				} );
			};

		// If "info.text" is set and is a function, gets the page content first
		// Set "info.getText" if you need get the content of another page other than "info.title"
		if ( typeof info.getText === 'string' || $.isFunction( info.text ) ) {
			api.getCurrentPageText( info.getText || info.title ).done( function( value ) {
				edit( value );
			} );
		} else {
			edit();
		}

		return apiDeferred.promise();
	},

	/**
	 * Stats edits
	 * @param {jQuery.Deferred} arguments The edits
	 * @example
		amp.doEdits(
			amp.editPage( info ) [,
			amp.editPage( info ) [,
			amp.editPage( info ) [,
			...
		] ] ] );
	 * @return {jQuery.Deferred}
	 */
	doEdits: function() {
		return $.when.apply( this, Array.prototype.slice.call( arguments, 1 ) );
	}
};

/**
 * Archives the proposal
 * @param {Array} pages
 */
amp.filing = function( pages, result ) {
	var pagesIndex = 0,
		merged = $( '#amp-result' ).val() === '1',
		removeTemplate = function() {
			amp.editPage( {
				title: pages[ pagesIndex++ ],
				text: function( value ) {
					return value.replace( /\{\{fusão ?(de|com)?(\|.+)?\}\}\n?/i, '' );
				}
			} ).done( function() {
				if ( pagesIndex < pages.length ) {
					removeTemplate();
				} else {
					$( '#amp-filing' ).text( amp.message( 'amp-filing-finished' ) );
					location.reload();
				}
			} );
		};

	$( '#amp-dialog label' ).after( '<br /><br /><div style="text-align: center;" id="amp-filing">' + amp.message( 'amp-filing' ) + '</div>' );
	$( '.ui-dialog-buttonset button' ).eq( 0 ).remove();
	$( '#amp-result' ).prop( 'disabled', true );
	$( '#amp-comment' ).prop( 'disabled', true );

	amp.doEdits(
		amp.editPage( {
			title: 'Wikipédia:Fusão/Central_de_fusões',
			text: function( value ) {
				return value.replace( '{' + '{fusões a avaliar|' + pages.join( '|' ) + '}}', '' );
			}
		} ),
		amp.editPage( {
			title: 'Wikipédia:Fusão/Central de fusões/' + pages.join( '; ' ),
			text: function( value ) {
				return value.replace( /(\|resultado ?=)/, '$1 ' + ( merged ? 'fundido' : 'não fundir' ) )
					+ ( $( '#amp-comment' ).val() !== '' ? '\n\n' + $( '#amp-comment' ).val() + ' ~~' + '~~' : '' );
			}
		} ),
		amp.editPage( {
			title: 'Wikipédia:Fusão/Central_de_fusões/Arquivo_de_' + ( !merged ? 'não_' : '' ) + 'fundidas/' + ( new Date() ).getFullYear(),
			appendtext: '\n* [[Wikipédia:Fusão/Central de fusões/' + pages.join( '; ' ) + ']]'
		} )
	).done( function() {
		if ( merged ) {
			$( '#amp-filing' ).text( amp.message( 'amp-filing-finished' ) );
			location.reload();
			return;
		}

		removeTemplate();
	} );
};

/**
 * Opens the prompt
 * @param {Array} pages
 */
amp.prompt = function( pages ) {
	$( '<div id="amp-dialog" class="ui-widget"></div>' ).dialog( {
		title: amp.message( 'amp-dialog-title' ),
		width: 'auto',
		height: 'auto',
		modal: true,
		buttons: {
			'OK': amp.filing.bind( undefined, pages ),
			'Cancelar': function () {
				$( '#amp-dialog' ).dialog( 'close' );
			}
		},
		open: function () {
			$( '.ui-dialog-titlebar-close' ).hide();
		},
		close: function () {
			$( '#amp-dialog' ).dialog( 'destroy' ).remove();
		}
	} ).append( amp.message( 'amp-dialog-result' ) + ': '
		+ '<select id="amp-result">'
			+ '<option value="1">' + amp.message( 'amp-dialog-result-1' ) + '</option>'
			+ '<option value="2">' + amp.message( 'amp-dialog-result-2' )+ '</option>'
		+ '</select><br /><br />'
		+ '<label>' + amp.message( 'amp-dialog-commentLabel' ) + ': <br /><textarea id="amp-comment" style="width: 300px;height: 200px;" placeholder="' +  amp.message( 'amp-dialog-commentPlaceholder' ) + '" /></label>'
	);
};

/**
 * Init the script
 */
amp.init = function() {
	$( 'h2' ).each( function( index ) {
		$( this ).next().find( 'p' ).append( ' [',
			$( '<a />', {
				'class': 'amp-archiveButton',
				'title': amp.message( 'amp-archiveButton-title' ),
				'text': amp.message( 'amp-archiveButton' )
			} ).click( amp.prompt.bind( undefined, $( this ).text().trim().split( /; ?/ ) ) ).css( 'cursor', 'pointer' ), ']'
		);
	} );

	$( '.amp-archiveButton' ).tipsy();
};

if ( mw.config.get( 'wgPageName' ) === 'Wikipédia:Fusão/Central_de_fusões' ) {
	mw.loader.using( [ 'ext.gadget.mediawiki.api.ptwiki', 'jquery.ui', 'jquery.tipsy' ], function () {
		$( amp.init );
	} );
}

}() );
