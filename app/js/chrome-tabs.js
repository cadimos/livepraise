(function(){
  const isNodeContext = typeof module !== 'undefined' && typeof module.exports !== 'undefined'
  if (isNodeContext) {
    Draggabilly = require('draggabilly');
  }

  const tabTemplate = `
    <div class="chrome-tab">
      <div class="chrome-tab-background">
        <div class="chrome-tab-background-effect"></div>
      </div>
      <div class="chrome-tab-favicon"></div>
      <div class="chrome-tab-title"></div>
      <div class="chrome-tab-close">
      </div>
      <input type="hidden" class="chrome-tab-id" value="">
    </div>
  `
  const contTemplate = `
    <div class="chrome-conteudo"></div>
  `

  const defaultTapProperties = {
    title: '',
    favicon: '',
    conteudo:'',
    debug: false
  }

  let instanceId = 0

  class ChromeTabs {
    constructor() {
      this.draggabillyInstances = []
    }

    init(el, options) {
      this.el = el
      this.options = options

      this.instanceId = instanceId
      this.el.setAttribute('data-chrome-tabs-instance-id', this.instanceId)
      instanceId += 1

      this.setupStyleEl()
      this.setupEvents()
      this.layoutTabs()
      this.fixZIndexes()
      this.setupDraggabilly()
    }

    emit(eventName, data,tabProperties) {
      tabProperties = Object.assign({}, defaultTapProperties, tabProperties)
      if(tabProperties.debug==true){
        this.el.dispatchEvent(new CustomEvent(eventName, { detail: data }))
      }
    }

    setupStyleEl() {
      this.animationStyleEl = document.createElement('style')
      this.el.appendChild(this.animationStyleEl)
    }

    setupEvents() {
      window.addEventListener('resize', event => this.layoutTabs())

      //this.el.addEventListener('dblclick', event => this.addTab())

      this.el.addEventListener('click', ({target}) => {
        if (target.classList.contains('chrome-tab')) {
          this.setCurrentTab(target)
        } else if (target.classList.contains('chrome-tab-close')) {
          this.removeTab(target.parentNode)
        } else if (target.classList.contains('chrome-tab-title') || target.classList.contains('chrome-tab-favicon')) {
          this.setCurrentTab(target.parentNode)
        }
      })
    }

    get tabEls() {
      return Array.prototype.slice.call(this.el.querySelectorAll('.chrome-tab'))
    }

    get tabContentEl() {
      return this.el.querySelector('.chrome-tabs-content')
    }

    get conteudoContentEl() {
      return this.el.querySelector('.chrome-tabs-conteudo')
    }

    get tabWidth() {
      const tabsContentWidth = this.tabContentEl.clientWidth - this.options.tabOverlapDistance
      const width = (tabsContentWidth / this.tabEls.length) + this.options.tabOverlapDistance
      return Math.max(this.options.minWidth, Math.min(this.options.maxWidth, width))
    }

    get tabEffectiveWidth() {
      return this.tabWidth - this.options.tabOverlapDistance
    }

    get tabPositions() {
      const tabEffectiveWidth = this.tabEffectiveWidth
      let left = 0
      let positions = []

      this.tabEls.forEach((tabEl, i) => {
        positions.push(left)
        left += tabEffectiveWidth
      })
      return positions
    }

    layoutTabs() {
      const tabWidth = this.tabWidth

      this.cleanUpPreviouslyDraggedTabs()
      this.tabEls.forEach((tabEl) => tabEl.style.width = tabWidth + 'px')
      requestAnimationFrame(() => {
        let styleHTML = ''
        this.tabPositions.forEach((left, i) => {
          styleHTML += `
            .chrome-tabs[data-chrome-tabs-instance-id="${ this.instanceId }"] .chrome-tab:nth-child(${ i + 1 }) {
              transform: translate3d(${ left }px, 0, 0)
            }
          `
        })
        this.animationStyleEl.innerHTML = styleHTML
      })
    }

    fixZIndexes() {
      const bottomBarEl = this.el.querySelector('.chrome-tabs-bottom-bar')
      const tabEls = this.tabEls

      tabEls.forEach((tabEl, i) => {
        let zIndex = tabEls.length - i

        if (tabEl.classList.contains('chrome-tab-current')) {
          bottomBarEl.style.zIndex = tabEls.length + 1
          zIndex = tabEls.length + 2
        }
        tabEl.style.zIndex = zIndex
      })
    }

    createNewTabEl() {
      const div = document.createElement('div')
      div.innerHTML = tabTemplate
      return div.firstElementChild
    }
    createNewContEl() {
      const div = document.createElement('div')
      div.innerHTML = contTemplate
      return div.firstElementChild
    }

    addTab(tabProperties) {
      const tabEl = this.createNewTabEl()
      const conteudoEl = this.createNewContEl()
      var lid=Math.floor(Math.random()*1000000);
      tabEl.classList.add('chrome-tab-just-added','chrome-tab-id-'+lid);
      conteudoEl.classList.add('chrome-conteudo-just-added','chrome-conteudo-id-'+lid);

      setTimeout(() => tabEl.classList.remove('chrome-tab-just-added'), 200)
      setTimeout(() => conteudoEl.classList.remove('chrome-conteudo-just-added'), 200)
      setTimeout(() => document.querySelector('.chrome-tab-id-'+lid+' .chrome-tab-id').value=lid, 200)

      tabProperties = Object.assign({}, defaultTapProperties, tabProperties)
      this.tabContentEl.appendChild(tabEl)
      this.conteudoContentEl.appendChild(conteudoEl)
      document.querySelector('.chrome-conteudo-id-'+lid).innerHTML = tabProperties.conteudo
      this.updateTab(tabEl, tabProperties)
      this.emit('tabAdd', { tabEl },tabProperties)
      setTimeout(() => this.setCurrentTab(tabEl),200);
      this.layoutTabs()
      this.fixZIndexes()
      this.setupDraggabilly()
      setTimeout(() => this.setCurrentTab(tabEl),200);

    }

    showCurrentTab(id){
      const currentCont = document.querySelector(".chrome-conteudo-show");
      if(currentCont){
        currentCont.classList.remove('chrome-conteudo-show');
      }
      if(id!=null && id!=''){
        document.querySelector(".chrome-conteudo-id-"+id).classList.add('chrome-conteudo-show')
      }
    }

    setCurrentTab(tabEl) {
      const currentTab = this.el.querySelector('.chrome-tab-current')
      const currentTabId = this.el.querySelector('.chrome-tab-current .chrome-tab-id')
      if(currentTabId){
        setTimeout(() => this.showCurrentTab(document.querySelector('.chrome-tab-current .chrome-tab-id').value),100)
      }
      if (currentTab) currentTab.classList.remove('chrome-tab-current')
      tabEl.classList.add('chrome-tab-current')
      this.fixZIndexes()
      this.emit('activeTabChange', { tabEl })
    }

    soNumero(string){
      if(string!=null && string!=''){
        var numsStr = string.replace(/[^0-9]/g,'');
      return parseInt(numsStr);
      }
    }

    removeConteudo(id){
      id = this.soNumero(id);
      const cont = document.querySelector(".chrome-conteudo-id-"+id);
      cont.parentNode.removeChild(cont);
    }

    removeTab(tabEl) {
      if (tabEl.classList.contains('chrome-tab-current')) {
        if (tabEl.previousElementSibling) {
          this.setCurrentTab(tabEl.previousElementSibling)
        } else if (tabEl.nextElementSibling) {
          this.setCurrentTab(tabEl.nextElementSibling)
        }
      }
      this.removeConteudo(tabEl.classList.item(1));
      tabEl.parentNode.removeChild(tabEl)
      this.emit('tabRemove', { tabEl })
      this.layoutTabs()
      this.fixZIndexes()
      this.setupDraggabilly()
    }

    updateTab(tabEl, tabProperties) {
      tabEl.querySelector('.chrome-tab-title').textContent = tabProperties.title
      tabEl.querySelector('.chrome-tab-favicon').style.backgroundImage = `url('${tabProperties.favicon}')`
    }

    cleanUpPreviouslyDraggedTabs() {
      this.tabEls.forEach((tabEl) => tabEl.classList.remove('chrome-tab-just-dragged'))
    }

    setupDraggabilly() {
      const tabEls = this.tabEls
      const tabEffectiveWidth = this.tabEffectiveWidth
      const tabPositions = this.tabPositions

      this.draggabillyInstances.forEach(draggabillyInstance => draggabillyInstance.destroy())

      tabEls.forEach((tabEl, originalIndex) => {
        const originalTabPositionX = tabPositions[originalIndex]
        const draggabillyInstance = new Draggabilly(tabEl, {
          axis: 'x',
          containment: this.tabContentEl
        })

        this.draggabillyInstances.push(draggabillyInstance)

        draggabillyInstance.on('dragStart', () => {
          this.cleanUpPreviouslyDraggedTabs()
          tabEl.classList.add('chrome-tab-currently-dragged')
          this.el.classList.add('chrome-tabs-sorting')
          this.fixZIndexes()
        })

        draggabillyInstance.on('dragEnd', () => {
          const finalTranslateX = parseFloat(tabEl.style.left, 10)
          tabEl.style.transform = `translate3d(0, 0, 0)`

          // Animate dragged tab back into its place
          requestAnimationFrame(() => {
            tabEl.style.left = '0'
            tabEl.style.transform = `translate3d(${ finalTranslateX }px, 0, 0)`

            requestAnimationFrame(() => {
              tabEl.classList.remove('chrome-tab-currently-dragged')
              this.el.classList.remove('chrome-tabs-sorting')

              this.setCurrentTab(tabEl)
              tabEl.classList.add('chrome-tab-just-dragged')

              requestAnimationFrame(() => {
                tabEl.style.transform = ''

                this.setupDraggabilly()
              })
            })
          })
        })

        draggabillyInstance.on('dragMove', (event, pointer, moveVector) => {
          // Current index be computed within the event since it can change during the dragMove
          const tabEls = this.tabEls
          const currentIndex = tabEls.indexOf(tabEl)

          const currentTabPositionX = originalTabPositionX + moveVector.x
          const destinationIndex = Math.max(0, Math.min(tabEls.length, Math.floor((currentTabPositionX + (tabEffectiveWidth / 2)) / tabEffectiveWidth)))

          if (currentIndex !== destinationIndex) {
            this.animateTabMove(tabEl, currentIndex, destinationIndex)
          }
        })
      })
    }

    animateTabMove(tabEl, originIndex, destinationIndex) {
      if (destinationIndex < originIndex) {
        tabEl.parentNode.insertBefore(tabEl, this.tabEls[destinationIndex])
      } else {
        tabEl.parentNode.insertBefore(tabEl, this.tabEls[destinationIndex + 1])
      }
    }
  }

  if (!isNodeContext) {
    module.exports = ChromeTabs
  } else {
    window.ChromeTabs = ChromeTabs
  }
})()
