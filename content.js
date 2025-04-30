(function(){
    function waitForSelector(sel, cb) {
      const el = document.querySelector(sel);
      if (el) return cb(el);
      const obs = new MutationObserver(() => {
        const e2 = document.querySelector(sel);
        if (e2) {
          obs.disconnect();
          cb(e2);
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  
    // Build dropdown panel
    const panel = document.createElement('div');
    panel.id = 'splitItPanel';
    panel.innerHTML = `
      <h2>
        Split Purchase
        <button class="closeBtn" type="button">×</button>
      </h2>
      <div id="initialForm">
        <p><strong>Item:</strong> <span id="itemName"></span></p>
        <p><strong>Price:</strong> $<span id="itemPrice"></span></p>
        <label>Name:<input id="primaryName"/></label>
        <label>Email:<input id="primaryEmail" type="email"/></label>
        <label>Due Date:<input id="dueDate" type="date"/></label>
        <hr/>
        <h3>Participants</h3>
        <div id="participants"></div>
        <button id="addParticipantBtn" type="button">Add</button>
        <p><strong>Your Share:</strong> $<span id="yourShare"></span></p>
        <button id="proceedBtn" type="button">Proceed</button>
      </div>
      <div id="statusView" style="display:none;">
        <h3>Status</h3>
        <table>
          <thead><tr><th>Name</th><th>Status</th></tr></thead>
          <tbody id="statusTable"></tbody>
        </table>
        <button id="dashboardBtn" type="button">Go to Dashboard</button>
      </div>`;
    document.body.appendChild(panel);
  
    // Close button
    panel.querySelector('.closeBtn').addEventListener('click', e => {
      e.stopPropagation(); e.preventDefault();
      panel.style.display = 'none';
    });
  
    let totalPrice = 0;
  
    function openPanel() {
      const title = document.getElementById('productTitle')?.innerText.trim() || '';
      const priceText =
        document.querySelector('.a-price .a-offscreen')?.innerText.replace(/[^0-9.]/g,'') || '0';
      totalPrice = parseFloat(priceText);
      panel.querySelector('#itemName').innerText = title;
      panel.querySelector('#itemPrice').innerText = totalPrice.toFixed(2);
  
      chrome.storage.sync.get(['primaryName','primaryEmail'], data => {
        panel.querySelector('#primaryName').value = data.primaryName || '';
        panel.querySelector('#primaryEmail').value = data.primaryEmail || '';
      });
  
      panel.querySelector('#participants').innerHTML = '';
      updateShare();
      panel.querySelector('#initialForm').style.display = '';
      panel.querySelector('#statusView').style.display = 'none';
      panel.style.display = 'block';
    }
  
    function updateShare() {
      let sum = 0;
      panel.querySelectorAll('.pAmount').forEach(i => sum += parseFloat(i.value) || 0);
      panel.querySelector('#yourShare').innerText = (totalPrice - sum).toFixed(2);
    }
  
    // Add participant
    panel.querySelector('#addParticipantBtn').addEventListener('click', e => {
      e.stopPropagation(); e.preventDefault();
      const div = document.createElement('div');
      div.className = 'participant';
      div.innerHTML = `
        <label>Name:<input class="pName"/></label>
        <label>Email:<input class="pEmail" type="email"/></label>
        <label>Amount:<input class="pAmount" type="number" step="0.01"/></label>`;
      div.querySelector('.pAmount').addEventListener('input', updateShare);
      panel.querySelector('#participants').appendChild(div);
    });
  
    // Proceed → status view + mail-agent calls
    panel.querySelector('#proceedBtn').addEventListener('click', e => {
      e.stopPropagation(); e.preventDefault();
      const item = panel.querySelector('#itemName').innerText;
      const tbody = panel.querySelector('#statusTable');
      tbody.innerHTML = '';
  
      // Primary user entry
      const primaryName = panel.querySelector('#primaryName').value;
      const primaryAmount = (totalPrice
        - [...panel.querySelectorAll('.pAmount')]
            .reduce((sum, i) => sum + (parseFloat(i.value)||0), 0)
      ).toFixed(2);
      tbody.insertAdjacentHTML('beforeend',
        `<tr><td>${primaryName}</td><td>Sent</td></tr>`);
  
      // Send mail-agent for primary
      fetch('mail-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Create an order for ${item} priced at ${primaryAmount}, for ${primaryName}`
        })
      });
  
      // Participants
      panel.querySelectorAll('.participant').forEach(div => {
        const name = div.querySelector('.pName').value;
        const amount = parseFloat(div.querySelector('.pAmount').value).toFixed(2);
        tbody.insertAdjacentHTML('beforeend',
          `<tr><td>${name}</td><td>Sent</td></tr>`);
  
        // Send mail-agent for each
        fetch('mail-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Create an order for ${item} priced at ${amount}, for ${name}`
          })
        });
      });
  
      panel.querySelector('#initialForm').style.display = 'none';
      panel.querySelector('#statusView').style.display = '';
    });
  
    // Go to Dashboard
    panel.querySelector('#dashboardBtn').addEventListener('click', e => {
      e.stopPropagation(); e.preventDefault();
      const user = encodeURIComponent(panel.querySelector('#primaryName').value || '');
      window.open(`file:///Users/divik/Desktop/Repos/splitify-ext/history.html`, '_blank');
    });
  
    // Inject the “Split It” button
    waitForSelector('input#add-to-cart-button, input#buy-now-button', btn => {
      const container = btn.closest('.a-button-stack') || btn.parentNode;
      const b = document.createElement('button');
      b.textContent = 'Split It';
      b.type = 'button';
      b.style.marginLeft = '8px';
      b.style.padding = '6px 10px';
      b.style.background = '#378FDF';
      b.style.border = 'none';
      b.style.color = '#fff';
      b.style.cursor = 'pointer';
      b.addEventListener('click', e => {
        e.stopPropagation(); e.preventDefault();
        openPanel();
      });
      container.appendChild(b);
    });
  })();
  