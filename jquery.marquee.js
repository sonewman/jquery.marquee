/**
 * author Remy Sharp
 * url http://remysharp.com/tag/marquee
 *
 * Ralph Jennings. 4/5/2013.
 * Added support for "resize" event. If triggered, marquee is resized according to
 * its parent's width and scroll position is updated accordingly.
 *
 * Sam Newman. 26/5/2013
 * Added options to be passed in through .marquee()

  options = {
    behavior : 'scroll',
    loop : 0-9,
    scrollamount : 1,
    direction : left,
    marqueeContainerClass : 'marquee-inner'
  }
  
 * Hacked resize event so that it is opt in, the returning marquee jQuery object is returned with a
 * 'resizeMarquee' method. Example:
 *
 * var $marquee = $('#marquee').marquee(*options*);
 * $(window).on('resize', function () {
 *   $marquee.resizeMarquee();
 * });
 */

(function ($) {
  $.fn.marquee = function (options) {
    var newMarquee = [], last = this.length, $newMarquee;

    function resizeMarquee (marquee) {
      var $marquee = $(marquee);
      return function () {
        $marquee.each(function () {
          var marqueeRedux = this,
              $marqueeRedux = $(marqueeRedux),
              state = $marqueeRedux.data('marqueeState'),
              $parent = $(marqueeRedux.parentElement),
              horizontal = /scrollWidth/.test(state.widthAxis),
              origStateWidth = state.width,
              newStateWidth = horizontal ? $parent.width() : $parent.height();

          // resize the widget
          if (horizontal) {
            $marqueeRedux.width(newStateWidth);
            $marqueeRedux.find('.' + (options.marqueeContainerClass || 'marquee-inner')).css('padding', '0 ' + newStateWidth + 'px');
            state.width = newStateWidth;
          } else {
            $marqueeRedux.height(newStateWidth);
            $marqueeRedux.find('.' + (options.marqueeContainerClass || 'marquee-inner')).css('padding', newStateWidth + 'px 0');
            state.width = newStateWidth;
          }
          // update the scroll amount so the text doesn't jump all over the place (stays in the same relative position top-left)
          state.last += (newStateWidth - origStateWidth);
          marqueeRedux[state.axis] = state.last;
        });
        return $marquee;
      };
    }

    // works out the left or right hand reset position, based on scroll
    // behavior, current direction and new direction
    function getReset(newDir, marqueeRedux, marqueeState) {
      var behavior = marqueeState.behavior, width = marqueeState.width, dir = marqueeState.dir;
      var r = 0;
      if (behavior == 'alternate') {
        r = newDir == 1 ? marqueeRedux[marqueeState.widthAxis] - (width*2) : width;
      } else if (behavior == 'slide') {
        if (newDir == -1) {
          r = dir == -1 ? marqueeRedux[marqueeState.widthAxis] : width;
        } else {
          r = dir == -1 ? marqueeRedux[marqueeState.widthAxis] - (width*2) : 0;
        }
      } else {
        r = newDir == -1 ? marqueeRedux[marqueeState.widthAxis] : 0;
      }
      return r;
    }

    // single "thread" animation
    function animateMarquee() {
      var i = newMarquee.length,
        marqueeRedux = null,
        $marqueeRedux = null,
        marqueeState = {},
        newMarqueeList = [],
        hitedge = false;
        
      while (i--) {
        marqueeRedux = newMarquee[i];
        $marqueeRedux = $(marqueeRedux);

        marqueeState = $marqueeRedux.data('marqueeState');

        //  item no longer in DOM so bail
        if (!marqueeState) {
          return;
        }
        
        if ($marqueeRedux.data('paused') !== true) {
          // TODO read scrollamount, dir, behavior, loops and last from data
          marqueeRedux[marqueeState.axis] += (marqueeState.scrollamount * marqueeState.dir);

          // only true if it's hit the end
          hitedge = marqueeState.dir == -1 ? marqueeRedux[marqueeState.axis] <= getReset(marqueeState.dir * -1, marqueeRedux, marqueeState) : marqueeRedux[marqueeState.axis] >= getReset(marqueeState.dir * -1, marqueeRedux, marqueeState);
          
          if ((marqueeState.behavior == 'scroll' && marqueeState.last == marqueeRedux[marqueeState.axis]) || (marqueeState.behavior == 'alternate' && hitedge && marqueeState.last != -1) || (marqueeState.behavior == 'slide' && hitedge && marqueeState.last != -1)) {                        
            if (marqueeState.behavior == 'alternate') {
              marqueeState.dir *= -1; // flip
            }
            marqueeState.last = -1;

            $marqueeRedux.trigger('stop');

            marqueeState.loops--;
            if (marqueeState.loops === 0) {
              if (marqueeState.behavior != 'slide') {
                marqueeRedux[marqueeState.axis] = getReset(marqueeState.dir, marqueeRedux, marqueeState);
              } else {
                // corrects the position
                marqueeRedux[marqueeState.axis] = getReset(marqueeState.dir * -1, marqueeRedux, marqueeState);
              }

              $marqueeRedux.trigger('end');
            } else {
              // keep this marquee going
              newMarqueeList.push(marqueeRedux);
              $marqueeRedux.trigger('start');
              marqueeRedux[marqueeState.axis] = getReset(marqueeState.dir, marqueeRedux, marqueeState);
            }
          } else {
            newMarqueeList.push(marqueeRedux);
          }
          marqueeState.last = marqueeRedux[marqueeState.axis];

          // store updated state only if we ran an animation
          $marqueeRedux.data('marqueeState', marqueeState);
        } else {
          // even though it's paused, keep it in the list
          newMarqueeList.push(marqueeRedux);                    
        }
      }

      newMarquee = newMarqueeList;

      if (newMarquee.length) {
        setTimeout(animateMarquee, 50);
      }
    }

    //  Set up options
    
    if (typeof options === 'string') {
      options = {
        className : options
      };
    } else if (typeof options !== 'object') {
      options = {};
    }

    if (options.loop === true) {
      options.loop = -1;
    } else if (options.loop === false) {
      options.loop = 0;
    }

    //  Adding speed options



    // TODO consider whether using .html() in the wrapping process could lead to loosing predefined events...
    this.each(function (i) {
      var marqueeRedux, $marqueeRedux, hitedge, direction, marqueeState, loop, horizontal,
        $marquee = $(this),
        width = $marquee.width() || $marquee.attr('width'),
        height = $marquee.height() || $marquee.attr('height');

      if (this.tagName === 'MARQUEE') {
        $marqueeRedux = $marquee.after('<div ' + (options.className ? 'class="' + options.className + '" ' : '') + 'style="display: block-inline; width: ' + width + 'px; height: ' + height + 'px; overflow: hidden;"><div class="' + (options.marqueeContainerClass || 'marquee-inner') + '" style="float: left; white-space: nowrap;">' + $marquee.html() + '</div></div>').next();
      } else {
        if (options.className) {
          $marquee.addClass(options.className);
        }
        $marqueeRedux = $marquee.css({
          width : width,
          height : height,
          display: 'inline-block',
          overflow: 'hidden'
        }).html('<div class="' + (options.marqueeContainerClass || 'marquee-inner') + '" style="float: left; white-space: nowrap;">' + $marquee.html() + '</div>');
      }
      
      marqueeRedux = $marqueeRedux.get(0);
      hitedge = 0;
      direction = options.direction || ($marquee.attr('direction') || 'left').toLowerCase();
      loop = options.loop || $marquee.attr('loop') || -1;
      horizontal = /left|right/.test(direction);
      marqueeState = {
        dir : /down|right/.test(direction) ? -1 : 1,
        axis : horizontal ? 'scrollLeft' : 'scrollTop',
        widthAxis : horizontal ? 'scrollWidth' : 'scrollHeight',
        last : -1,
        loops : loop,
        scrollamount : options.scrollAmount || $marquee.attr('scrollamount') || 2,
        behavior : (options.behavior || $marquee.attr('behavior') || 'scroll').toLowerCase(),
        width : horizontal ? width : height
      };
      
      // corrects a bug in Firefox - the default loops for slide is -1
      if (loop == -1 && marqueeState.behavior == 'slide') {
        marqueeState.loops = 1;
      }

      if (this.tagName === 'MARQUEE') {
        $marquee.remove();
      }
      
      // add padding
      if (horizontal) {
        $marqueeRedux.find('.' + (options.marqueeContainerClass || 'marquee-inner')).css('padding', '0 ' + width + 'px');
      } else {
        $marqueeRedux.find('.' + (options.marqueeContainerClass || 'marquee-inner')).css('padding', height + 'px 0');
      }
      
      $marqueeRedux.data('marqueeState', marqueeState)
      // events
      .bind('stop', function () {
        $marqueeRedux.data('paused', true);
      }).bind('pause', function () {
        $marqueeRedux.data('paused', true);
      }).bind('start', function () {
        $marqueeRedux.data('paused', false);
      }).bind('unpause', function () {
        $marqueeRedux.data('paused', false);
      });//.data('marqueeState', marqueeState); // finally: store the state

      // todo - rerender event allowing us to do an ajax hit and redraw the marquee

      newMarquee.push(marqueeRedux);

      marqueeRedux[marqueeState.axis] = getReset(marqueeState.dir, marqueeRedux, marqueeState);
      $marqueeRedux.trigger('start');
      
      // on the very last marquee, trigger the animation
      if (i+1 == last) {
        animateMarquee();
      }
    });

    $newMarquee = $(newMarquee);

    $newMarquee.resizeMarquee = resizeMarquee(newMarquee);

    return $newMarquee;
  };
}(jQuery));