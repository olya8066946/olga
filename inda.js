scope         event.SubscriptionScope
	genesisBlock  *types.Block

	chainmu sync.RWMutex // blockchain insertion lock
	// This mutex synchronizes chain write operations.
	// Readers don't need to take it, they can just read the database.
	chainmu *syncx.ClosableMutex

	currentBlock     atomic.Value // Current head of the block chain
	currentFastBlock atomic.Value // Current head of the fast-sync chain (may be above the block chain!)
@@ -196,8 +200,8 @@ type BlockChain struct {
	txLookupCache *lru.Cache     // Cache for the most recent transaction lookup data.
	futureBlocks  *lru.Cache     // future blocks are blocks added for later processing

	quit          chan struct{}  // blockchain quit channel
	wg            sync.WaitGroup // chain processing wait group for shutting down
	wg            sync.WaitGroup //
	quit          chan struct{}  // shutdown signal, closed in Stop.
	running       int32          // 0 if chain is running, 1 when stopped
	procInterrupt int32          // interrupt signaler for block processing

@@ -235,6 +239,7 @@ func NewBlockChain(db ethdb.Database, cacheConfig *CacheConfig, chainConfig *par
			Preimages: cacheConfig.Preimages,
		}),
		quit:           make(chan struct{}),
		chainmu:        syncx.NewClosableMutex(),
		shouldPreserve: shouldPreserve,
		bodyCache:      bodyCache,
		bodyRLPCache:   bodyRLPCache,
@@ -278,6 +283,7 @@ func NewBlockChain(db ethdb.Database, cacheConfig *CacheConfig, chainConfig *par
	if err := bc.loadLastState(); err != nil {
		return nil, err
	}
