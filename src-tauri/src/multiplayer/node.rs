use std::fmt;

use iroh::{Endpoint, endpoint::presets, protocol::Router};
use iroh_blobs::{ALPN as BLOBS_ALPN, BlobsProtocol, store::mem::MemStore};
use iroh_docs::{ALPN as DOCS_ALPN, protocol::Docs};
use iroh_gossip::{ALPN as GOSSIP_ALPN, net::Gossip};

/// Process-wide iroh node. Created lazily on the first session and kept alive
/// for the rest of the app's lifetime — sessions come and go, but the QUIC
/// endpoint and protocol clients are expensive to reinitialise.
pub struct IrohNode {
    pub endpoint: Endpoint,
    pub blobs: MemStore,
    pub docs: Docs,
    pub gossip: Gossip,
    _router: Router,
}

impl fmt::Debug for IrohNode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("IrohNode").finish_non_exhaustive()
    }
}

impl IrohNode {
    /// Bind a new endpoint and spin up the blobs/gossip/docs protocols behind a router.
    ///
    /// # Errors
    /// Returns an error if the endpoint can't bind or any of the protocols fail to spawn.
    pub async fn spawn() -> anyhow::Result<Self> {
        let endpoint = Endpoint::bind(presets::N0).await?;
        let blobs = MemStore::default();
        let gossip = Gossip::builder().spawn(endpoint.clone());
        let docs = Docs::memory()
            .spawn(endpoint.clone(), (*blobs).clone(), gossip.clone())
            .await?;

        let router = Router::builder(endpoint.clone())
            .accept(BLOBS_ALPN, BlobsProtocol::new(&blobs, None))
            .accept(GOSSIP_ALPN, gossip.clone())
            .accept(DOCS_ALPN, docs.clone())
            .spawn();

        Ok(Self {
            endpoint,
            blobs,
            docs,
            gossip,
            _router: router,
        })
    }
}
